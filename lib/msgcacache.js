// Simple in-memory message cache for anti-delete
const cache = new Map();
const MAX_SIZE = 500;

export function cacheMessage(key, msg) {
  if (!key?.id) return;
  cache.set(key.id, msg);

  // Trim old entries
  if (cache.size > MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

export function getCachedMessage(id) {
  return cache.get(id);
}