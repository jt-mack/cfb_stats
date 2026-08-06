const API_BASE = (
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "/api/cfb"
).replace(/\/$/, "");

/** Dedupe concurrent GET requests to the same URL within a render cycle. */
const inflightGets = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const pathPrefix = API_BASE.startsWith("http")
    ? API_BASE.endsWith("/api/cfb")
      ? API_BASE
      : `${API_BASE}/api/cfb`
    : API_BASE;
  const search = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
        )
        .join("&")
    : "";
  return `${pathPrefix}${path.startsWith("/") ? path : `/${path}`}${search}`;
}

/**
 * GET request to the CFB API. Throws ApiError on non-2xx.
 * Concurrent identical requests share one in-flight fetch.
 */
export async function get<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = buildUrl(path, params);
  const existing = inflightGets.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof (data as { error?: string })?.error === "string"
          ? (data as { error: string }).error
          : (data as { message?: string })?.message ??
            `Request failed: ${res.status}`;
      throw new ApiError(message, res.status, data);
    }
    return data as T;
  })();

  inflightGets.set(url, promise);
  try {
    return await promise;
  } finally {
    inflightGets.delete(url);
  }
}
