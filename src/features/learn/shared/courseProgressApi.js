import { apiFetch } from "../../../lib/apiClient";

async function request(courseId, path, token, options = {}) {
  const data = await apiFetch(
    `/auth/learn/${encodeURIComponent(courseId)}/progress${path}`,
    {
      token,
      fallbackMessage: `Unable to sync ${courseId} progress`,
      ...options,
    },
  );
  return data.progress;
}

export function getCourseProgress(token, courseId) {
  return request(courseId, "", token);
}

export function setLastCourseLesson(token, courseId, lessonId) {
  return request(courseId, "/last-lesson", token, {
    method: "POST",
    body: JSON.stringify({ lessonId }),
  });
}

export function completeCourseLesson(token, courseId, lesson) {
  return request(courseId, "/complete", token, {
    method: "POST",
    body: JSON.stringify({ lesson }),
  });
}

export function saveCourseCode(token, courseId, lessonId, code) {
  return request(courseId, "/code", token, {
    method: "POST",
    body: JSON.stringify({ lessonId, code }),
  });
}

export function saveCourseNote(token, courseId, lessonId, note) {
  return request(courseId, "/note", token, {
    method: "POST",
    body: JSON.stringify({ lessonId, note }),
  });
}

export function toggleCourseBookmark(token, courseId, lessonId) {
  return request(courseId, "/bookmark", token, {
    method: "POST",
    body: JSON.stringify({ lessonId }),
  });
}

export function addCourseTime(token, courseId, minutes) {
  return request(courseId, "/time", token, {
    method: "POST",
    body: JSON.stringify({ minutes }),
  });
}

export async function listMyCourseProgress(token) {
  const data = await apiFetch("/auth/learn/progress", {
    token,
    fallbackMessage: "Unable to load course progress",
  });
  return data.courses || [];
}

export async function listPublicCourseProgress(username) {
  const clean = String(username || "").replace(/^@/, "").trim();
  const data = await apiFetch(
    `/auth/username/${encodeURIComponent(clean)}/learn/progress`,
    {
      auth: false,
      fallbackMessage: "Unable to load public course progress",
    },
  );
  return data.courses || [];
}

export async function mergeLocalCourseProgress(token, courses) {
  const data = await apiFetch("/auth/learn/progress/merge", {
    token,
    method: "POST",
    body: JSON.stringify({ courses }),
    fallbackMessage: "Unable to merge local progress",
  });
  return data.results || {};
}

export function progressToMap(progress) {
  return (progress?.completedLessons || []).reduce((acc, item) => {
    acc[item.lessonId] = { xp: item.xp, at: item.completedAt };
    return acc;
  }, {});
}

export function savedCodeToMap(progress) {
  return (progress?.savedCode || []).reduce((acc, item) => {
    acc[item.lessonId] = item.code;
    return acc;
  }, {});
}

export function notesToMap(progress) {
  return (progress?.notes || []).reduce((acc, item) => {
    acc[item.lessonId] = item.note;
    return acc;
  }, {});
}
