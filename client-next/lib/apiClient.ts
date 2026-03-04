const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "/api/cfb";

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

/**
 * GET request to the CFB API. Throws ApiError on non-2xx.
 */
export async function get<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const pathPrefix = API_BASE.startsWith("http")
    ? `${API_BASE.replace(/\/$/, "")}/api/cfb`
    : "/api/cfb";
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
  const url = `${pathPrefix}${path.startsWith("/") ? path : `/${path}`}${search}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof (data as { error?: string })?.error === "string"
        ? (data as { error: string }).error
        : (data as { message?: string })?.message ?? `Request failed: ${res.status}`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}
