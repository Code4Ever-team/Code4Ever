const inflight = new Map<string, Promise<Response>>();

export function fetchDeduped(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const key = `${init?.method ?? "GET"} ${url}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = fetch(url, init).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
