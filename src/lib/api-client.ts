// Frontend API client helpers
export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const msg = data?.error || `خطای سرور (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export async function apiUpload<T = any>(path: string, body: BodyInit): Promise<T> {
  const res = await fetch(path, { method: "POST", body, credentials: "include" });
  const text = await res.text();
  let data: any = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) throw new Error(data?.error || `خطای سرور (${res.status})`);
  return data as T;
}
