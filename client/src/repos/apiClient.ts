const API_BASE = '/api/cfb';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * GET request to the CFB API. Throws ApiError on non-2xx.
 */
export async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const search = params
    ? '?' +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}${search}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : data?.message ?? `Request failed: ${res.status}`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}
