/**
 * Normalizes the configured primary domain (PRIMARY_DOMAIN on the server,
 * VITE_PRIMARY_DOMAIN in the browser build) to a bare hostname.
 *
 * Both sides build hostnames by prefixing "app." — a value pasted as
 * "https://chatboatai.in/", "www.chatboatai.in" or with stray quotes /
 * whitespace would otherwise produce hosts like "app.https://..." that never
 * match, silently breaking the root/app subdomain split. Returns undefined
 * for an unset/blank value so callers keep treating the split as disabled.
 */
export function normalizePrimaryDomain(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let value = raw.trim().replace(/^["']|["']$/g, "").trim().toLowerCase();
  value = value.replace(/^[a-z]+:\/\//, ""); // scheme
  value = value.split(/[/?#]/)[0]; // path / query / hash
  value = value.replace(/:\d+$/, ""); // port
  value = value.replace(/^\.+|\.+$/g, ""); // leading/trailing dots
  value = value.replace(/^www\./, "");
  return value || undefined;
}

/** True when `hostname` is the primary domain itself or any subdomain of it. */
export function isHostUnderDomain(hostname: string | undefined, domain: string): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}
