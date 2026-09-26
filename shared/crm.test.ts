import { describe, expect, it } from "vitest";
import { createDealSchema, createLeadSchema, createTaskSchema, updateTaskSchema } from "./crm";

describe("createLeadSchema", () => {
  it("applies defaults and normalises optional fields", () => {
    const lead = createLeadSchema.parse({ name: "  Rohit Sharma ", email: "Rohit@Example.COM", phone: "" });
    expect(lead).toMatchObject({
      name: "Rohit Sharma",
      email: "rohit@example.com",
      phone: null,
      source: "manual",
      status: "new",
      estimatedValueInr: null,
    });
  });

  it("rejects a missing name, a bad email and an unknown source", () => {
    expect(createLeadSchema.safeParse({ name: "" }).success).toBe(false);
    expect(createLeadSchema.safeParse({ name: "A", email: "not-an-email" }).success).toBe(false);
    expect(createLeadSchema.safeParse({ name: "A", source: "carrier_pigeon" }).success).toBe(false);
  });

  it("does not accept an ownerUserId from the client", () => {
    const lead = createLeadSchema.parse({ name: "A", ownerUserId: "someone-else" } as any);
    expect(lead).not.toHaveProperty("ownerUserId");
  });
});

describe("createDealSchema", () => {
  it("coerces the value to whole rupees and defaults the stage", () => {
    expect(createDealSchema.parse({ title: "Website revamp", valueInr: "125000" })).toMatchObject({
      valueInr: 125000,
      stage: "new",
    });
  });

  it("rejects negative, fractional, oversized values and unknown stages", () => {
    expect(createDealSchema.safeParse({ title: "x", valueInr: -1 }).success).toBe(false);
    expect(createDealSchema.safeParse({ title: "x", valueInr: 10.5 }).success).toBe(false);
    expect(createDealSchema.safeParse({ title: "x", valueInr: 3_000_000_000 }).success).toBe(false);
    expect(createDealSchema.safeParse({ title: "x", stage: "maybe" }).success).toBe(false);
  });
});

describe("task schemas", () => {
  it("requires a valid due date", () => {
    expect(createTaskSchema.safeParse({ title: "Call back" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "Call back", dueAt: "not a date" }).success).toBe(false);
    const task = createTaskSchema.parse({ title: "Call back", dueAt: "2026-09-26T04:30:00.000Z" });
    expect(task.dueAt).toBeInstanceOf(Date);
    expect(task.type).toBe("follow_up");
  });

  it("accepts a completion toggle on update", () => {
    expect(updateTaskSchema.parse({ completed: true })).toEqual({ completed: true });
  });
});
