import {
  COURSE_PROGRESS_REGISTRY,
  storageKeysForPrefix,
} from "./courseRegistry";
import { mergeLocalCourseProgress } from "./courseProgressApi";
import {
  decodeUserIdFromToken,
  readScopedJson,
  readScopedString,
} from "./scopedProgressStorage";

function readUnscopedJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function hasLocalPayload(payload) {
  return (
    Object.keys(payload.completedMap || {}).length > 0 ||
    Object.keys(payload.savedCodeMap || {}).length > 0 ||
    Object.keys(payload.notesMap || {}).length > 0 ||
    (payload.bookmarks || []).length > 0 ||
    Boolean(payload.lastLessonId)
  );
}

/**
 * Collect localStorage progress for all registered courses and merge into Mongo.
 * Safe to call after login/register; errors are swallowed.
 */
export async function mergeLearnProgressOnLogin(token, user) {
  if (!token) return;

  const userId =
    user?._id || user?.id || decodeUserIdFromToken(token) || null;
  const courses = {};

  for (const entry of COURSE_PROGRESS_REGISTRY) {
    const keys = storageKeysForPrefix(entry.storagePrefix);
    let completedMap = {};
    let savedCodeMap = {};
    let notesMap = {};
    let bookmarks = [];
    let lastLessonId = null;

    if (entry.scoped && userId) {
      completedMap = readScopedJson(keys.progress, user, {}, token);
      savedCodeMap = readScopedJson(keys.savedCode, user, {}, token);
      bookmarks = readScopedJson(keys.bookmarks, user, [], token);
      lastLessonId = readScopedString(keys.lastLesson, user, token);
      if (entry.notes) {
        notesMap = readScopedJson(keys.notes, user, {}, token);
      }
    }

    // Also pick up unscoped / legacy keys (common on older courses)
    const unscopedCompleted = readUnscopedJson(keys.progress, {});
    const unscopedCode = readUnscopedJson(keys.savedCode, {});
    const unscopedBookmarks = readUnscopedJson(keys.bookmarks, []);
    const unscopedLast = localStorage.getItem(keys.lastLesson);
    const unscopedNotes = entry.notes
      ? readUnscopedJson(keys.notes, {})
      : {};

    completedMap = { ...unscopedCompleted, ...completedMap };
    savedCodeMap = { ...unscopedCode, ...savedCodeMap };
    notesMap = { ...unscopedNotes, ...notesMap };
    bookmarks = Array.from(
      new Set([...(unscopedBookmarks || []), ...(bookmarks || [])]),
    );
    lastLessonId = lastLessonId || unscopedLast || null;

    const payload = {
      completedMap,
      savedCodeMap,
      notesMap,
      bookmarks,
      lastLessonId,
    };

    if (hasLocalPayload(payload)) {
      courses[entry.courseId] = payload;
    }
  }

  if (Object.keys(courses).length === 0) return;

  try {
    await mergeLocalCourseProgress(token, courses);
  } catch (error) {
    console.warn("Learn progress merge failed:", error.message);
  }
}
