// Caching and comparison utilities

// Get cached data with expiration check
export function getCachedData(key, maxAgeMs = null) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (maxAgeMs && parsed && parsed._ts) {
      const now = Date.now();
      if (now - parsed._ts > maxAgeMs) return null;
    }
    return parsed && typeof parsed === "object" && "_ts" in parsed
      ? parsed.data
      : parsed;
  } catch {
    return null;
  }
}

// Set cached data with timestamp
export function setCachedData(key, data) {
  try {
    const wrapped = { data, _ts: Date.now() };
    localStorage.setItem(key, JSON.stringify(wrapped));
  } catch {}
}

export function isDataDifferent(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}
