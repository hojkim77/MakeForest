const EXPRESS_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export class ApiError extends Error {
  constructor(public status: number, public body?: unknown) {
    super(`${status}`);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let mergedInit = init;
  const isServerRequest = typeof window === 'undefined' && url.startsWith(EXPRESS_URL) && INTERNAL_SECRET
  if (isServerRequest) {
    mergedInit = { ...init, headers: { 'x-internal-secret': INTERNAL_SECRET, ...init?.headers } };
  }
  const res = await fetch(url, mergedInit);
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch {}
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}
export const api = {
  get: <T>(url: string, init?: RequestInit) =>
    apiFetch<T>(url, init),
  post: <T>(url: string, body?: unknown) =>
    apiFetch<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(body !== undefined && { body: JSON.stringify(body) }) }),
  patch: <T>(url: string, body?: unknown) =>
    apiFetch<T>(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, ...(body !== undefined && { body: JSON.stringify(body) }) }),
  delete: <T>(url: string) =>
    apiFetch<T>(url, { method: 'DELETE' }),
};
