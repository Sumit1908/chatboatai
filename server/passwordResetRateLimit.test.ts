// 10. Exercises the actual rate-limit middleware used on POST
// /api/forgot-password (server/auth/localAuth.ts), not a re-implementation
// of it - same technique as server/trustProxy.test.ts: a real minimal
// Express server on an ephemeral port, driven with real HTTP requests.
import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import http, { type Server } from "http";
import { forgotPasswordRateLimiter } from "./passwordReset";

let activeServer: Server | undefined;

afterEach(() => {
  activeServer?.close();
  activeServer = undefined;
});

function startServer(): Promise<{ server: Server; port: number }> {
  const app = express();
  app.post("/api/forgot-password", forgotPasswordRateLimiter, (_req, res) => {
    res.json({ message: "If an account exists for this email, we have sent password reset instructions." });
  });
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, port });
    });
  });
}

function post(port: number): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path: "/api/forgot-password", method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        res.on("data", () => {});
        res.on("end", () => resolve({ status: res.statusCode || 0 }));
      },
    );
    req.on("error", reject);
    req.end(JSON.stringify({ email: "someone@example.com" }));
  });
}

describe("forgotPasswordRateLimiter", () => {
  it("allows requests up to the configured limit, then rejects with 429", async () => {
    const { server, port } = await startServer();
    activeServer = server;

    // forgotPasswordRateLimiter allows 5 requests per window (see
    // server/auth/localAuth.ts) - all from this same client/IP.
    for (let i = 0; i < 5; i++) {
      const res = await post(port);
      expect(res.status).toBe(200);
    }

    const sixth = await post(port);
    expect(sixth.status).toBe(429);
  });
});
