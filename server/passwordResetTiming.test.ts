// Fix #2 verification: POST /api/forgot-password must not let its response
// timing reveal whether an email is registered. Recreates the route's exact
// wiring (fire-and-forget requestPasswordReset with .catch() logging, same
// as server/auth/localAuth.ts) against a real minimal Express server driven
// by real HTTP requests — same technique as server/trustProxy.test.ts and
// server/passwordResetRateLimit.test.ts — rather than importing the real
// route, which would pull in the live DB pool (see those files' own notes).
import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import http, { type Server } from "http";
import {
  requestPasswordReset,
  FORGOT_PASSWORD_RESPONSE_MESSAGE,
  type PasswordResetStore,
  type PasswordResetMailer,
  type PasswordResetUserRecord,
} from "./passwordReset";

const SLOW_MAILER_DELAY_MS = 250;
const RESPONSE_TIME_BUDGET_MS = 100; // must return well under the slow-mailer delay above

class FakeStore implements PasswordResetStore {
  users = new Map<string, PasswordResetUserRecord & { passwordHash: string }>();

  addUser(record: PasswordResetUserRecord & { passwordHash: string }) {
    this.users.set(record.id, record);
  }

  async findUserByEmail(email: string) {
    for (const u of this.users.values()) {
      if (u.email === email) return { ...u };
    }
    return undefined;
  }

  async findUserByResetTokenHash() {
    return undefined;
  }

  async setResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    const u = this.users.get(userId);
    if (u) {
      u.passwordResetTokenHash = tokenHash;
      u.passwordResetExpiresAt = expiresAt;
    }
  }

  async setPasswordAndConsumeToken() {}
  async invalidateAllSessions() {}
}

function slowMailer(delayMs: number, shouldFail = false): PasswordResetMailer {
  return {
    sendPasswordResetEmail: () =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (shouldFail) reject(new Error("simulated Resend failure"));
          else resolve();
        }, delayMs);
      }),
  };
}

let activeServer: Server | undefined;

afterEach(() => {
  activeServer?.close();
  activeServer = undefined;
});

function startServer(store: PasswordResetStore, mailer: PasswordResetMailer): Promise<{ server: Server; port: number }> {
  const app = express();
  app.use(express.json());
  app.post("/api/forgot-password", (req, res) => {
    const { email } = req.body || {};
    // Exact wiring under test: NOT awaited, same as server/auth/localAuth.ts.
    if (typeof email === "string" && email.trim()) {
      requestPasswordReset(email, store, mailer).catch(() => {
        // Matches the real route's console.error(...) — silenced here to
        // keep test output clean; the point under test is the response
        // path below, not this log line.
      });
    }
    res.json({ message: FORGOT_PASSWORD_RESPONSE_MESSAGE });
  });
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, port });
    });
  });
}

function post(port: number, email: string): Promise<{ status: number; body: any; elapsedMs: number }> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path: "/api/forgot-password", method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode || 0, body: JSON.parse(data || "{}"), elapsedMs: Date.now() - start }),
        );
      },
    );
    req.on("error", reject);
    req.end(JSON.stringify({ email }));
  });
}

describe("POST /api/forgot-password response timing and shape", () => {
  it("7. responds with the identical body and status for an existing vs. a non-existing email", async () => {
    const store = new FakeStore();
    store.addUser({
      id: "user-1",
      email: "real@example.com",
      passwordHash: "$2a$10$existinghash",
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
    const { server, port } = await startServer(store, slowMailer(SLOW_MAILER_DELAY_MS));
    activeServer = server;

    const existing = await post(port, "real@example.com");
    const missing = await post(port, "nobody@example.com");

    expect(existing.status).toBe(missing.status);
    expect(existing.body).toEqual(missing.body);
    expect(existing.body).toEqual({ message: FORGOT_PASSWORD_RESPONSE_MESSAGE });
  });

  it("does not make the response measurably slower for an existing email (the DB write + mailer call are not awaited)", async () => {
    const store = new FakeStore();
    store.addUser({
      id: "user-1",
      email: "real@example.com",
      passwordHash: "$2a$10$existinghash",
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
    const { server, port } = await startServer(store, slowMailer(SLOW_MAILER_DELAY_MS));
    activeServer = server;

    const existing = await post(port, "real@example.com");
    const missing = await post(port, "nobody@example.com");

    // Both responses return well before the slow mailer's delay would have
    // elapsed — if the route were awaiting requestPasswordReset, the
    // existing-email response would take >= SLOW_MAILER_DELAY_MS while the
    // missing-email one would return almost instantly, a clear timing
    // oracle. Asserting both stay under the same small budget proves
    // that gap doesn't exist.
    expect(existing.elapsedMs).toBeLessThan(RESPONSE_TIME_BUDGET_MS);
    expect(missing.elapsedMs).toBeLessThan(RESPONSE_TIME_BUDGET_MS);
  });

  it("6. a mailer/send failure for an existing email does not turn the request into a non-200 response", async () => {
    const store = new FakeStore();
    store.addUser({
      id: "user-1",
      email: "real@example.com",
      passwordHash: "$2a$10$existinghash",
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });
    const { server, port } = await startServer(store, slowMailer(20, /* shouldFail */ true));
    activeServer = server;

    const res = await post(port, "real@example.com");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: FORGOT_PASSWORD_RESPONSE_MESSAGE });

    // Let the background rejection actually settle (and be swallowed by the
    // route's .catch()) before the test process exits, so it can't surface
    // as an unhandled rejection attributed to a later test.
    await new Promise((resolve) => setTimeout(resolve, 40));
  });

  it("5. the response body is the fixed generic message regardless of malformed input", async () => {
    const store = new FakeStore();
    const { server, port } = await startServer(store, slowMailer(10));
    activeServer = server;

    const res = await post(port, "");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: FORGOT_PASSWORD_RESPONSE_MESSAGE });
  });
});
