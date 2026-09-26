import { describe, expect, it } from "vitest";
import { checkEnvironment, checkIndexes, type IndexState } from "./deployChecks";

const fullEnv = {
  DATABASE_URL: "postgres://x",
  SESSION_SECRET: "s",
  FACEBOOK_APP_SECRET: "f",
  FACEBOOK_APP_ID: "1",
  APP_URL: "https://chatboatai.in",
  RAZORPAY_KEY_ID: "k",
  RAZORPAY_KEY_SECRET: "k",
  RAZORPAY_WEBHOOK_SECRET: "w",
  RESEND_API_KEY: "r",
};

describe("checkEnvironment", () => {
  it("passes with everything set", () => {
    expect(checkEnvironment(fullEnv)).toEqual({ errors: [], warnings: [] });
  });

  it("only warns (does not block the deploy) when FACEBOOK_APP_SECRET is missing or blank", () => {
    for (const value of [undefined, "", "   "]) {
      const { errors, warnings } = checkEnvironment({ ...fullEnv, FACEBOOK_APP_SECRET: value });
      expect(errors).toEqual([]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("FACEBOOK_APP_SECRET");
      expect(warnings[0]).toContain("rejected");
    }
  });

  it("fails for the other required variables too", () => {
    const { errors } = checkEnvironment({});
    expect(errors.map((e) => e.split(" ")[4])).toEqual(["DATABASE_URL", "SESSION_SECRET"]);
  });

  it("only warns about optional integrations", () => {
    const { errors, warnings } = checkEnvironment({ ...fullEnv, RAZORPAY_KEY_ID: undefined, RESEND_API_KEY: undefined });
    expect(errors).toEqual([]);
    expect(warnings.join(" ")).toMatch(/RAZORPAY_KEY_ID.*RESEND_API_KEY/);
  });

  it("never echoes secret values", () => {
    const secretish = { ...fullEnv, SESSION_SECRET: "super-secret-value-123", FACEBOOK_APP_SECRET: undefined };
    const out = JSON.stringify(checkEnvironment(secretish));
    expect(out).not.toContain("super-secret-value-123");
  });

  it("rejects the test-only Graph API override in a real environment", () => {
    expect(checkEnvironment({ ...fullEnv, META_GRAPH_API_ORIGIN: "http://127.0.0.1:5999" }).errors[0]).toContain("META_GRAPH_API_ORIGIN");
    expect(checkEnvironment({ ...fullEnv, META_GRAPH_API_ORIGIN: "https://graph.facebook.com" }).errors).toEqual([]);
  });

  it("rejects the test-only Razorpay API override in a real environment", () => {
    expect(checkEnvironment({ ...fullEnv, RAZORPAY_API_ORIGIN: "http://127.0.0.1:5998" }).errors[0]).toContain("RAZORPAY_API_ORIGIN");
    expect(checkEnvironment({ ...fullEnv, RAZORPAY_API_ORIGIN: "https://api.razorpay.com" }).errors).toEqual([]);
  });
});

const good = (table: string, index: string): IndexState => ({
  table, index, tableExists: true, indexExists: true, indexIsUnique: true, duplicateGroups: 0,
});

describe("checkIndexes", () => {
  it("passes when both unique indexes exist", () => {
    expect(checkIndexes([good("contacts", "contacts_account_phone_uidx"), good("messages", "messages_whatsapp_id_uidx")]).errors).toEqual([]);
  });

  it("fails with duplicate details when an index is missing because of duplicates", () => {
    const { errors } = checkIndexes([
      { ...good("contacts", "contacts_account_phone_uidx"), indexExists: false, indexIsUnique: false, duplicateGroups: 3 },
    ]);
    expect(errors[0]).toMatch(/contacts_account_phone_uidx is missing.*3 duplicate/);
  });

  it("fails when an index is missing even without duplicates, and says how to fix it", () => {
    const { errors } = checkIndexes([
      { ...good("messages", "messages_whatsapp_id_uidx"), indexExists: false, indexIsUnique: false },
    ]);
    expect(errors[0]).toMatch(/messages_whatsapp_id_uidx is missing.*npm run db:indexes/);
  });

  it("fails when the index exists but is not unique", () => {
    const { errors } = checkIndexes([{ ...good("contacts", "contacts_account_phone_uidx"), indexIsUnique: false }]);
    expect(errors[0]).toContain("not UNIQUE");
  });

  it("allows a brand-new database where the tables don't exist yet", () => {
    const res = checkIndexes([{ ...good("contacts", "contacts_account_phone_uidx"), tableExists: false, indexExists: false }]);
    expect(res.errors).toEqual([]);
    expect(res.warnings[0]).toContain("new database");
  });
});
