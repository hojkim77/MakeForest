async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status}`);
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
