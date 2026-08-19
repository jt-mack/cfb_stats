import type { Response } from 'express';
import { routeCache } from './cache';
import { EMPTY_PAYLOAD_TTL_MS, getDefaultSeason, isEmptyPayload } from './espn-client';

const MIN_SEASON = 1869;
const MAX_SEASON = 2100;

export function parseSeasonQuery(value: unknown): number | null {
  if (value == null || value === '') return getDefaultSeason();
  const n = Number(value);
  if (Number.isNaN(n) || n < MIN_SEASON || n > MAX_SEASON) return null;
  return n;
}

export function parseYearParam(value: string): number | null {
  const n = Number(value);
  if (Number.isNaN(n) || n < MIN_SEASON || n > MAX_SEASON) return null;
  return n;
}

export function parseWeekParam(value: string): number | null {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0 || n > 20) return null;
  return n;
}

export async function cachedJson<T>(
  res: Response,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<void> {
  try {
    const cached = routeCache.get<T>(key);
    if (cached !== undefined) {
      res.json(cached);
      return;
    }
    const data = await loader();
    // Empty payloads (common in preseason before ESPN publishes) get a short
    // TTL so real data appears promptly instead of being negative-cached.
    const ttl = isEmptyPayload(data)
      ? Math.min(ttlSeconds, EMPTY_PAYLOAD_TTL_MS / 1000)
      : ttlSeconds;
    routeCache.set(key, data, ttl);
    res.json(data);
  } catch (error) {
    console.error(`Route error [${key}]:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Request failed' });
  }
}
