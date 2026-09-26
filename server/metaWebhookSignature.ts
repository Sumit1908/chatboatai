import crypto from "crypto";

// Meta signs every webhook POST body (WhatsApp message/status callbacks
// included) with HMAC-SHA256 keyed by the App Secret, sent as
// `X-Hub-Signature-256: sha256=<hex digest>`. Without checking this, anyone
// who finds the webhook URL can forge inbound messages or delivery/read
// status updates. See:
// https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads
//
// Kept as a small pure function (no Express types) so it's testable without
// booting the app, same pattern as ./phone.ts.
export function verifyMetaWebhookSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  appSecret: string | undefined,
): boolean {
  if (!appSecret || !signatureHeader || rawBody === undefined) {
    return false;
  }

  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }
  const providedHex = signatureHeader.slice(prefix.length).trim();

  // Must be computed over the exact bytes Meta signed - a re-serialized
  // req.body would not match. server/index.ts's express.json `verify`
  // callback captures those raw bytes onto req.rawBody for this purpose
  // (the same mechanism the existing Razorpay webhook check relies on).
  const expectedHex = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const providedBuf = Buffer.from(providedHex, "hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");

  // Length check before timingSafeEqual: it throws on mismatched lengths
  // rather than returning false, and a malformed/short header is exactly
  // the case that must fail closed, not crash the request.
  return providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
}
