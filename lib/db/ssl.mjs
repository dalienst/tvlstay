// Whether to use SSL for a Postgres URL. Off for local databases and Railway's private
// network (*.railway.internal, already private and unencrypted by design), or when the URL
// says sslmode=disable. On (required) for everything else, e.g. Neon or Railway's public URL.
export function sslFor(url) {
  if (/sslmode=disable/i.test(url)) return false;
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {}
  if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) || host.endsWith(".railway.internal")) return false;
  return "require";
}
