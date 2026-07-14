/**
 * Clear PolyCode browser localStorage.
 *
 * Browser console (on the app origin):
 *   PolyCodeClearLocalStorage.clear('learn')
 *   PolyCodeClearLocalStorage.clear('learn+auth')
 *   PolyCodeClearLocalStorage.clear('all')
 *
 * Or open: /clear-local-storage.html
 */
(function (global) {
  const AUTH_KEYS = new Set(["token", "username", "profilePath"]);

  const LEARN_SUFFIXES = [
    "_progress",
    "_saved_code",
    "_bookmarks",
    "_last_lesson",
    "_notes",
  ];

  const LEARN_PATTERNS = [
    /_read_/,
    /_confidence_/,
    /_quiz_attempts_/,
    /^polycode_annotations_/,
  ];

  function listAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys.sort();
  }

  function isLearnKey(key) {
    if (LEARN_PATTERNS.some((re) => re.test(key))) return true;
    return LEARN_SUFFIXES.some((suffix) => key.endsWith(suffix));
  }

  function selectKeys(mode) {
    const all = listAllKeys();
    if (mode === "all") return all;

    return all.filter((key) => {
      if (isLearnKey(key)) return true;
      if (mode === "learn+auth" && AUTH_KEYS.has(key)) return true;
      return false;
    });
  }

  function preview(mode = "learn") {
    const keys = selectKeys(mode);
    return { mode, keys };
  }

  function clear(mode = "learn") {
    const keys = selectKeys(mode);
    keys.forEach((key) => localStorage.removeItem(key));
    return { mode, keys, removed: keys.length };
  }

  global.PolyCodeClearLocalStorage = { preview, clear, listAllKeys };
})(typeof window !== "undefined" ? window : globalThis);
