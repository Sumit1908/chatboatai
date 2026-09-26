import { describe, expect, it } from "vitest";
import { RETIRED_PAGE_REDIRECTS } from "./retiredPages";

describe("retired marketing page redirects", () => {
  it("only ever point at the home page or one of its sections", () => {
    for (const [from, to] of Object.entries(RETIRED_PAGE_REDIRECTS)) {
      expect(from).toMatch(/^\/[a-z-]+$/);
      expect(to).toMatch(/^\/(#[a-z-]+)?$/);
    }
  });

  it("never redirect a page that still exists", () => {
    for (const live of ["/", "/pricing", "/contact", "/login", "/privacy", "/terms", "/refund", "/delete-data"]) {
      expect(RETIRED_PAGE_REDIRECTS[live]).toBeUndefined();
    }
  });
});
