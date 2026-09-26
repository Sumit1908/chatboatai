import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fromLocalInputValue, toLocalInputValue } from "./datetime";

// Run as a user in India (UTC+5:30), whatever timezone the machine has.
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Asia/Kolkata";
});
afterAll(() => {
  process.env.TZ = originalTz;
});

describe("datetime-local <-> UTC", () => {
  it("stores 10:00 IST as 04:30 UTC", () => {
    expect(fromLocalInputValue("2026-09-26T10:00")).toBe("2026-09-26T04:30:00.000Z");
  });

  it("shows a stored UTC time back in local time (not UTC)", () => {
    expect(toLocalInputValue("2026-09-26T04:30:00.000Z")).toBe("2026-09-26T10:00");
  });

  it("round-trips without drifting (re-saving an edited schedule keeps the time)", () => {
    let value = "2026-12-31T23:45";
    for (let i = 0; i < 5; i++) value = toLocalInputValue(fromLocalInputValue(value));
    expect(value).toBe("2026-12-31T23:45");
  });

  it("handles empty and invalid input", () => {
    expect(fromLocalInputValue("")).toBeUndefined();
    expect(fromLocalInputValue("not a date")).toBeUndefined();
    expect(toLocalInputValue(null)).toBe("");
    expect(toLocalInputValue("garbage")).toBe("");
  });
});
