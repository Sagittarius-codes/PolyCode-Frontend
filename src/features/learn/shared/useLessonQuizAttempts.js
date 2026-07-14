import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import {
  engagementToMap,
  getCourseProgress,
  upsertLessonEngagement,
} from "./courseProgressApi";
import { getCourseIdByStoragePrefix } from "./courseRegistry";
import {
  REQUIRED_QUIZ_COUNT,
  countAttemptedQuizzes,
  loadQuizAttempts,
  prepareLessonQuizzes,
  quizAttemptsKey,
  recordQuizAttempt,
} from "./lessonQuizUtils";

/**
 * Prepares lesson theory with ≥2 MCQs and tracks which ones the learner attempted.
 * Guests: localStorage. Signed-in: Mongo engagement + local cache.
 */
export default function useLessonQuizAttempts(storagePrefix, lessonId, lesson) {
  const { token, isAuthenticated } = useAuth();
  const courseId = getCourseIdByStoragePrefix(storagePrefix);

  const preparedLesson = useMemo(
    () => prepareLessonQuizzes(lesson),
    [lesson],
  );

  const quizCount = REQUIRED_QUIZ_COUNT;
  const [attempts, setAttempts] = useState({});

  useEffect(() => {
    if (!storagePrefix || !lessonId) {
      setAttempts({});
      return undefined;
    }

    const localAttempts = loadQuizAttempts(storagePrefix, lessonId);
    setAttempts(localAttempts);

    if (!isAuthenticated || !token || !courseId) return undefined;

    let cancelled = false;
    getCourseProgress(token, courseId)
      .then((progress) => {
        if (cancelled) return;
        const entry = engagementToMap(progress)[lessonId];
        const remoteAttempts = entry?.quizAttempts || {};
        if (Object.keys(remoteAttempts).length === 0) return;

        const merged = { ...localAttempts, ...remoteAttempts };
        setAttempts(merged);
        localStorage.setItem(
          quizAttemptsKey(storagePrefix, lessonId),
          JSON.stringify(merged),
        );
      })
      .catch(() => {
        /* keep local values */
      });

    return () => {
      cancelled = true;
    };
  }, [storagePrefix, lessonId, isAuthenticated, token, courseId]);

  const recordAttempt = useCallback(
    (quizIndex, selectedIndex) => {
      if (!storagePrefix || !lessonId) return;
      recordQuizAttempt(storagePrefix, lessonId, quizIndex, selectedIndex);
      setAttempts((prev) => {
        const next = {
          ...prev,
          [String(quizIndex)]: selectedIndex,
        };
        if (token && courseId) {
          upsertLessonEngagement(token, courseId, {
            lessonId,
            quizAttempts: { [String(quizIndex)]: selectedIndex },
          }).catch((error) => {
            console.warn("Quiz engagement sync failed:", error.message);
          });
        }
        return next;
      });
    },
    [storagePrefix, lessonId, token, courseId],
  );

  const attemptedCount = countAttemptedQuizzes(attempts, quizCount);
  const allQuizzesAttempted = attemptedCount >= quizCount;

  const getSelection = useCallback(
    (quizIndex) => {
      const value = attempts[String(quizIndex)];
      return value === undefined ? null : value;
    },
    [attempts],
  );

  return {
    preparedLesson,
    quizCount,
    attemptedCount,
    allQuizzesAttempted,
    recordAttempt,
    getSelection,
  };
}
