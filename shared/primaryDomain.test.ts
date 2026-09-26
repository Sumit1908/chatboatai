import { describe, expect, it } from "vitest";
import { isHostUnderDomain, normalizePrimaryDomain } from "./primaryDomain";

describe("normalizePrimaryDomain", () => {
  it("returns undefined for unset or blank values", () => {
    expect(normalizePrimaryDomain(undefined)).toBeUndefined();
    expect(normalizePrimaryDomain("")).toBeUndefined();
    expect(normalizePrimaryDomain("   ")).toBeUndefined();
  });

  it("keeps an already-bare domain unchanged", () => {
    expect(normalizePrimaryDomain("chatboatai.in")).toBe("chatboatai.in");
  });

  it("strips scheme, path, port, www., quotes, dots and whitespace", () => {
    expect(normalizePrimaryDomain("https://chatboatai.in/")).toBe("chatboatai.in");
    expect(normalizePrimaryDomain(" www.ChatBoatAI.in ")).toBe("chatboatai.in");
    expect(normalizePrimaryDomain('"chatboatai.in"')).toBe("chatboatai.in");
    expect(normalizePrimaryDomain("http://chatboatai.in:443/login?x=1")).toBe("chatboatai.in");
    expect(normalizePrimaryDomain(".chatboatai.in")).toBe("chatboatai.in");
  });
});

describe("isHostUnderDomain", () => {
  it("matches the domain and its subdomains only", () => {
    expect(isHostUnderDomain("chatboatai.in", "chatboatai.in")).toBe(true);
    expect(isHostUnderDomain("app.chatboatai.in", "chatboatai.in")).toBe(true);
    expect(isHostUnderDomain("APP.chatboatai.in", "chatboatai.in")).toBe(true);
    expect(isHostUnderDomain("chatboatai-xyz.onrender.com", "chatboatai.in")).toBe(false);
    expect(isHostUnderDomain("evilchatboatai.in", "chatboatai.in")).toBe(false);
    expect(isHostUnderDomain(undefined, "chatboatai.in")).toBe(false);
  });
});
