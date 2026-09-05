// apiRequest() throws Error(`${status}: ${body}`). The body is usually a
// small JSON error object ({"error": "..."} or {"details": "..."}), but on
// gateway failures - a 502 from Render mid-deploy, a Cloudflare timeout,
// etc. - the body is a full HTML error page instead. Naively falling back
// to the raw message dumps that entire page (markup, inline CSS, embedded
// fonts) into a toast. This only ever returns parsed JSON detail text or a
// clean fixed fallback - never raw, unparsed response text.
export function parseApiError(error: unknown, fallback: string): string {
  const message = (error as { message?: unknown })?.message;
  if (typeof message !== "string") return fallback;

  // Try the whole message as JSON first (locally-thrown validation errors
  // aren't prefixed with a status code), then the part after the first
  // "<status>: " prefix apiRequest adds.
  const candidates = [message, message.slice(message.indexOf(":") + 1).trim()];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const detail = parsed?.details || parsed?.error;
      if (typeof detail === "string" && detail.trim()) return detail;
    } catch {}
  }
  return fallback;
}
