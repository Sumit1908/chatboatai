import { describe, expect, it } from "vitest";
import { closedAtForStageChange, monthBoundsIst, percentChange, startOfTodayIst } from "./metrics";

describe("monthBoundsIst", () => {
  it("uses the IST calendar month, as UTC instants", () => {
    const { lastMonthStart, thisMonthStart, nextMonthStart } = monthBoundsIst(new Date("2026-09-25T10:00:00Z"));
    // 1 Sep 00:00 IST = 31 Aug 18:30 UTC
    expect(thisMonthStart.toISOString()).toBe("2026-08-31T18:30:00.000Z");
    expect(nextMonthStart.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(lastMonthStart.toISOString()).toBe("2026-07-31T18:30:00.000Z");
  });

  it("puts 1:00 AM IST on the 1st in the new month even though it's still last month in UTC", () => {
    const now = new Date("2026-09-30T19:30:00Z"); // 1 Oct 01:00 IST
    expect(monthBoundsIst(now).thisMonthStart.toISOString()).toBe("2026-09-30T18:30:00.000Z");
  });

  it("rolls the year over in January", () => {
    const { lastMonthStart } = monthBoundsIst(new Date("2026-01-10T00:00:00Z"));
    expect(lastMonthStart.toISOString()).toBe("2025-11-30T18:30:00.000Z");
  });
});

describe("startOfTodayIst", () => {
  it("returns IST midnight", () => {
    expect(startOfTodayIst(new Date("2026-09-25T20:00:00Z")).toISOString()).toBe("2026-09-25T18:30:00.000Z");
  });
});

describe("percentChange", () => {
  it("rounds to a whole percent", () => {
    expect(percentChange(12, 9)).toBe(33);
    expect(percentChange(5, 10)).toBe(-50);
  });

  it("returns null without a baseline instead of an infinite increase", () => {
    expect(percentChange(4, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe("closedAtForStageChange", () => {
  const now = new Date("2026-09-25T10:00:00Z");
  const earlier = new Date("2026-09-01T10:00:00Z");

  it("stamps the close time when a deal is won or lost", () => {
    expect(closedAtForStageChange("negotiation", "won", null, now)).toEqual(now);
    expect(closedAtForStageChange(null, "lost", null, now)).toEqual(now);
  });

  it("keeps the original close time when moving between closed stages", () => {
    expect(closedAtForStageChange("won", "lost", earlier, now)).toEqual(earlier);
  });

  it("clears it when a deal is reopened", () => {
    expect(closedAtForStageChange("won", "proposal", earlier, now)).toBeNull();
  });
});
