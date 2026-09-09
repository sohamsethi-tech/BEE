/** Fetch with AbortController timeout (Hermes-safe; no AbortSignal.timeout). */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  ms = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
