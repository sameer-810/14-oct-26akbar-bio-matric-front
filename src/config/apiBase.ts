/**
 * The API's address always ends in /api/v1, however the host's setting was
 * typed: "https://x.onrender.com", "https://x.onrender.com/" and
 * "https://x.onrender.com/api/v1" all work.
 */
export function apiBase(url: string) {
  const u = url.trim().replace(/\/+$/, "");
  return !u || u.endsWith("/api/v1") ? u : `${u}/api/v1`;
}
