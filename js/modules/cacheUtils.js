// Caching and comparison utilities
export function getCachedData(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export function setCachedData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export function isDataDifferent(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}
