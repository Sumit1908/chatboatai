import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyMetaWebhookSignature } from "./metaWebhookSignature";

const APP_SECRET = "test-app-secret";

function sign(body: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyMetaWebhookSignature", () => {
  it("accepts a signature computed correctly over the raw body", () => {
    const rawBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const signature = sign(rawBody, APP_SECRET);
    expect(verifyMetaWebhookSignature(rawBody, signature, APP_SECRET)).toBe(true);
  });

  it("accepts when rawBody is a Buffer (as express.json's verify hook provides)", () => {
    const rawBody = Buffer.from(JSON.stringify({ object: "whatsapp_business_account" }));
    const signature = sign(rawBody.toString(), APP_SECRET);
    expect(verifyMetaWebhookSignature(rawBody, signature, APP_SECRET)).toBe(true);
  });

  it("rejects a signature that doesn't match the body (wrong secret)", () => {
    const rawBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const signature = sign(rawBody, "wrong-secret");
    expect(verifyMetaWebhookSignature(rawBody, signature, APP_SECRET)).toBe(false);
  });

  it("rejects a signature that doesn't match the body (tampered payload)", () => {
    const original = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const signature = sign(original, APP_SECRET);
    const tampered = JSON.stringify({ object: "whatsapp_business_account", entry: [{ injected: true }] });
    expect(verifyMetaWebhookSignature(tampered, signature, APP_SECRET)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
    expect(verifyMetaWebhookSignature(rawBody, undefined, APP_SECRET)).toBe(false);
  });

  it("rejects an empty-string signature header", () => {
    const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
    expect(verifyMetaWebhookSignature(rawBody, "", APP_SECRET)).toBe(false);
  });

  it("rejects a signature missing the required sha256= prefix", () => {
    const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
    const bareHex = crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
    expect(verifyMetaWebhookSignature(rawBody, bareHex, APP_SECRET)).toBe(false);
  });

  it("rejects malformed non-hex signature content", () => {
    const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
    expect(verifyMetaWebhookSignature(rawBody, "sha256=not-valid-hex!!", APP_SECRET)).toBe(false);
  });

  it("rejects when the app secret is not configured", () => {
    const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
    const signature = sign(rawBody, APP_SECRET);
    expect(verifyMetaWebhookSignature(rawBody, signature, undefined)).toBe(false);
    expect(verifyMetaWebhookSignature(rawBody, signature, "")).toBe(false);
  });

  it("rejects when rawBody is undefined (body parser didn't run / body missing)", () => {
    const signature = sign("{}", APP_SECRET);
    expect(verifyMetaWebhookSignature(undefined, signature, APP_SECRET)).toBe(false);
  });

  it("uses the exact raw body for HMAC calculation, not a re-serialized version", () => {
    // Same logical JSON, different byte-for-byte formatting (key order /
    // whitespace) - a signature computed over one must not validate the
    // other, proving the check is over raw bytes and not a parsed/re-stringified object.
    const rawBodyA = `{"object":"whatsapp_business_account","entry":[]}`;
    const rawBodyB = `{"object": "whatsapp_business_account", "entry": []}`;
    const signatureForA = sign(rawBodyA, APP_SECRET);
    expect(verifyMetaWebhookSignature(rawBodyA, signatureForA, APP_SECRET)).toBe(true);
    expect(verifyMetaWebhookSignature(rawBodyB, signatureForA, APP_SECRET)).toBe(false);
  });
});
