/** Dot/bracket path helpers for live response shape checks. */

export function getPath(value: unknown, path: string): unknown {
  if (value == null) return undefined;
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = value;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    const m = part.match(/^(\w+)\[(\d+)\]$/);
    if (m) {
      const key = m[1];
      const idx = Number(m[2]);
      const arr = (cur as Record<string, unknown>)[key];
      if (!Array.isArray(arr)) return undefined;
      cur = arr[idx];
      continue;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function hasPath(value: unknown, path: string): boolean {
  return getPath(value, path) !== undefined;
}

/** True when value is nullish, empty array, or empty plain object. */
export function isEmptyPayload(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

export function missingPaths(value: unknown, paths: string[]): string[] {
  return paths.filter((p) => !hasPath(value, p));
}

export function requireKeys(obj: unknown, keys: string[]): string[] {
  if (obj == null || typeof obj !== 'object') return keys;
  const record = obj as Record<string, unknown>;
  return keys.filter((k) => record[k] === undefined);
}
