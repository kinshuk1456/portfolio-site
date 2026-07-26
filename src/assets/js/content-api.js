// content-api.js
// Responsibilities:
// - Fetch JSON/Markdown from /content with caching
// - Provide helpful errors for missing content

const _cache = new Map();

export function withCache(key, fn) {
  if (_cache.has(key)) return _cache.get(key);
  const promise = fn();
  _cache.set(key, promise);
  return promise;
}

export async function fetchJSON(path) {
  return withCache(`json:${path}`, async () => {
    const res = await fetch(path, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Failed to load JSON (${res.status}): ${path}`);
    return res.json();
  });
}

export async function fetchText(path) {
  return withCache(`text:${path}`, async () => {
    const res = await fetch(path, { headers: { 'Accept': 'text/plain' } });
    if (!res.ok) throw new Error(`Failed to load text (${res.status}): ${path}`);
    return res.text();
  });
}

export async function fetchMaybeJSON(path) {
  try {
    return await fetchJSON(path);
  } catch {
    return null;
  }
}

export function clearCache() {
  _cache.clear();
}
