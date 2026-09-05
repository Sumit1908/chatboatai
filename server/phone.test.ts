import { describe, it, expect } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("returns null/undefined/empty input as an empty string", () => {
    expect(normalizePhone(null)).toBe("");
    expect(normalizePhone(undefined)).toBe("");
    expect(normalizePhone("")).toBe("");
  });

  it("strips symbols and whitespace from a formatted number", () => {
    expect(normalizePhone("+91 87663-50093")).toBe("8766350093");
  });

  it("keeps a bare 10-digit local number as-is", () => {
    expect(normalizePhone("9876543210")).toBe("9876543210");
  });

  it("takes the last 10 digits when a country code is present", () => {
    expect(normalizePhone("919876543210")).toBe("9876543210");
  });

  it("takes the last 10 digits from Meta's wa_id shape (digits only)", () => {
    expect(normalizePhone("919876543210")).toBe(normalizePhone("+91-98765-43210"));
  });

  it("returns fewer than 10 digits unchanged (does not pad)", () => {
    expect(normalizePhone("12345")).toBe("12345");
  });

  it("treats numbers as equal after normalization regardless of source formatting", () => {
    const csvImport = "0" + "9876543210"; // leading trunk-prefix 0 some users type
    const webhookWaId = "919876543210";
    expect(normalizePhone(csvImport)).toBe(normalizePhone(webhookWaId));
  });
});
