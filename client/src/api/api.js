const API_BASE = import.meta.env.VITE_API_BASE || "https://api.nix-ai.dev/api";

export async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export { API_BASE };
