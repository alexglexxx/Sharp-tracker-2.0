export async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 10000);
  try {
    const response = await fetch(url, {
      ...options,
      timeoutMs: undefined,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(options.headers || {}) },
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return data;
  } finally { clearTimeout(timeout); }
}
