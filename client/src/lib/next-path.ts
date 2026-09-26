/**
 * Where to send someone after they log in or sign up (e.g. back to the plan
 * they picked on the pricing page). Only same-site paths are allowed, so a
 * crafted link like /login?next=https://evil.example can't redirect users
 * off ChatBoatAI after they authenticate.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Control characters (incl. newlines) are never part of a real path.
  if (/[\u0000-\u001f]/.test(raw)) return null;
  const value = raw.trim();
  // Must be a path on this site: "/x", never "//host", "/\host" or a scheme.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  // Don't bounce back into the auth pages themselves.
  const pathname = value.split(/[?#]/)[0];
  if (["/login", "/admin-login", "/logout"].includes(pathname)) return null;
  return value;
}

/** Reads ?next= from a search string ("?a=b&next=..."). */
export function nextFromSearch(search: string): string | null {
  return safeNextPath(new URLSearchParams(search).get("next"));
}

/** Login URL that returns the visitor to `path` afterwards. */
export function loginUrlFor(path: string, mode: "login" | "register" = "register"): string {
  const params = new URLSearchParams({ mode });
  const next = safeNextPath(path);
  if (next) params.set("next", next);
  return `/login?${params.toString()}`;
}
