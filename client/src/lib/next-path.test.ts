import { describe, expect, it } from "vitest";
import { loginUrlFor, nextFromSearch, safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("allows same-site paths with query strings", () => {
    expect(safeNextPath("/billing?plan=growth")).toBe("/billing?plan=growth");
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
  });

  it("rejects anything that could leave the site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "evil", "", "  "]) {
      expect(safeNextPath(bad)).toBeNull();
    }
  });

  it("rejects control characters and auth-page loops", () => {
    expect(safeNextPath("/billing\n")).toBeNull();
    expect(safeNextPath("/login?next=/x")).toBeNull();
    expect(safeNextPath("/admin-login")).toBeNull();
  });
});

describe("login round trip", () => {
  it("builds a sign-up link that returns to the chosen plan", () => {
    const url = loginUrlFor("/billing?plan=growth");
    expect(url).toBe("/login?mode=register&next=%2Fbilling%3Fplan%3Dgrowth");
    expect(nextFromSearch(url.slice(url.indexOf("?")))).toBe("/billing?plan=growth");
  });

  it("drops an unsafe destination but keeps the mode", () => {
    expect(loginUrlFor("https://evil.example")).toBe("/login?mode=register");
  });
});
