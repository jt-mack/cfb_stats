import type CfbService from 'sportsdataverse/dist/services/cfb.service';

/** CFB namespace: legacy service methods + generated `espnCfb*` wrappers. */
export type SdvCfbModule = typeof CfbService & Record<string, (params?: Record<string, unknown>) => Promise<unknown>>;

type SdvModule = Record<string, Record<string, unknown>> & { cfb: SdvCfbModule };

let sdvModule: SdvModule | null = null;
let axiosEspnPatchApplied = false;

/**
 * Native dynamic import — avoids TS compiling to require() in CJS output.
 * Critical for axios: CJS `require('axios')` and ESM `import('axios')` are
 * different instances; sportsdataverse is ESM and must see the patched one.
 */
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<{ default: unknown }>;

type AxiosLike = {
  create: (...args: unknown[]) => {
    defaults: { headers: Record<string, unknown> & { common?: Record<string, unknown> } };
    interceptors: { request: { use: (fn: (req: AxiosRequestLike) => AxiosRequestLike) => void } };
  };
  interceptors: { request: { use: (fn: (req: AxiosRequestLike) => AxiosRequestLike) => void } };
};

type AxiosRequestLike = {
  url?: string;
  baseURL?: string;
  headers?: Record<string, unknown> & { delete?: (k: string) => void };
};

function stripUserAgentHeaders(headers: Record<string, unknown> & { delete?: (k: string) => void } | undefined): void {
  if (!headers) return;
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'user-agent') delete headers[key];
  }
  if (typeof headers.delete === 'function') {
    headers.delete('User-Agent');
    headers.delete('user-agent');
  }
}

/**
 * ESPN / Akamai returns 403 for sportsdataverse's default User-Agent.
 * Patch the ESM axios instance before SDV loads so its shared client omits UA.
 */
async function patchAxiosForEspn(): Promise<void> {
  if (axiosEspnPatchApplied) return;
  axiosEspnPatchApplied = true;
  const axios = (await dynamicImport('axios')).default as AxiosLike;

  const stripEspnUserAgent = (req: AxiosRequestLike): AxiosRequestLike => {
    const url = `${req.baseURL ?? ''}${req.url ?? ''}`;
    if (!/espn\.com|espncdn\.com/i.test(url)) return req;
    stripUserAgentHeaders(req.headers);
    return req;
  };

  axios.interceptors.request.use(stripEspnUserAgent);

  const originalCreate = axios.create.bind(axios);
  axios.create = ((config?: { headers?: Record<string, unknown> }) => {
    if (config?.headers) stripUserAgentHeaders(config.headers);
    const instance = originalCreate(config);
    const headers = instance.defaults.headers;
    stripUserAgentHeaders(headers);
    stripUserAgentHeaders(headers.common);
    instance.interceptors.request.use(stripEspnUserAgent);
    return instance;
  }) as typeof axios.create;
}

export async function getSdv(): Promise<SdvModule> {
  if (!sdvModule) {
    await patchAxiosForEspn();
    const mod = await dynamicImport('sportsdataverse');
    sdvModule = mod.default as SdvModule;
  }
  return sdvModule;
}

/** Typed accessor for the CFB namespace. */
export async function getCfb(): Promise<SdvCfbModule> {
  return (await getSdv()).cfb;
}

/** Minimum gap between ESPN API calls to stay polite. */
const MIN_REQUEST_GAP_MS = 75;

/** Fail fast so one hung ESPN call cannot block the whole queue indefinitely. */
const REQUEST_TIMEOUT_MS = 10_000;

type CacheEntry = { expiresAt: number; value: unknown };

const MAX_CACHE_ENTRIES = 500;

/** In-memory cache for raw ESPN/SDV payloads (keyed by sdvRequest cacheKey). Assembled HTTP responses use lib/cache.ts routeCache. */
const responseCache = new Map<string, CacheEntry>();

function pruneResponseCache(): void {
  const now = Date.now();
  for (const [key, entry] of responseCache) {
    if (entry.expiresAt <= now) responseCache.delete(key);
  }
  if (responseCache.size <= MAX_CACHE_ENTRIES) return;
  const oldest = [...responseCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  while (responseCache.size > MAX_CACHE_ENTRIES && oldest.length > 0) {
    responseCache.delete(oldest.shift()![0]);
  }
}
const inflightByKey = new Map<string, Promise<unknown>>();

let queue: (() => void)[] = [];
let queueRunning = false;
let lastRequestAt = 0;

export function getDefaultSeason(): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  return month <= 2 ? year - 1 : year;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ESPN request timed out after ${ms}ms`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function runQueued<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(async () => {
      try {
        const now = Date.now();
        const wait = Math.max(0, MIN_REQUEST_GAP_MS - (now - lastRequestAt));
        if (wait > 0) await delay(wait);
        lastRequestAt = Date.now();
        resolve(await withTimeout(fn(), timeoutMs));
      } catch (error) {
        reject(error);
      }
    });
    drainQueue();
  });
}

async function drainQueue(): Promise<void> {
  if (queueRunning) return;
  queueRunning = true;
  while (queue.length > 0) {
    const task = queue.shift();
    if (task) await task();
  }
  queueRunning = false;
}

export type SdvRequestOptions = {
  cacheKey?: string;
  cacheTtlMs?: number;
  timeoutMs?: number;
};

/** Cap TTL for empty payloads so preseason/offseason empties don't get locked in. */
export const EMPTY_PAYLOAD_TTL_MS = 2 * 60 * 1000;

/**
 * True for payloads that carry no data: null/undefined, empty arrays, empty
 * objects, and objects whose only array members are all empty (e.g. `{ items: [] }`).
 */
export function isEmptyPayload(data: unknown): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    const values = Object.values(data as Record<string, unknown>);
    if (values.length === 0) return true;
    const arrays = values.filter((v) => Array.isArray(v)) as unknown[][];
    return arrays.length > 0 && arrays.every((a) => a.length === 0);
  }
  return false;
}

export async function sdvRequest<T>(
  request: () => Promise<T>,
  options?: SdvRequestOptions
): Promise<T> {
  const cacheKey = options?.cacheKey;
  const cacheTtlMs = options?.cacheTtlMs ?? 15 * 60 * 1000;

  if (cacheKey) {
    pruneResponseCache();
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }
    const inflight = inflightByKey.get(cacheKey);
    if (inflight) return inflight as Promise<T>;
  }

  const promise = runQueued(request, options?.timeoutMs ?? REQUEST_TIMEOUT_MS).finally(() => {
    if (cacheKey) inflightByKey.delete(cacheKey);
  });

  if (cacheKey) {
    inflightByKey.set(cacheKey, promise);
    promise
      .then((value) => {
        const ttl = isEmptyPayload(value) ? Math.min(cacheTtlMs, EMPTY_PAYLOAD_TTL_MS) : cacheTtlMs;
        responseCache.set(cacheKey, { value, expiresAt: Date.now() + ttl });
        pruneResponseCache();
      })
      .catch((err) => {
        console.warn(`sdvRequest cache write failed [${cacheKey}]:`, err instanceof Error ? err.message : err);
      });
  }

  return promise;
}

export async function safeUnwrap<T>(
  request: () => Promise<T>,
  fallback: T,
  options?: SdvRequestOptions
): Promise<T> {
  try {
    return await sdvRequest(request, options);
  } catch {
    return fallback;
  }
}
