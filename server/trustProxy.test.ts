// Verifies the `app.set("trust proxy", 1)` line in server/index.ts actually
// does what its comment claims, without booting the real app (which needs a
// live DB, session store, and queues - not appropriate for a unit test; see
// CLAUDE.md on server/index.ts and server/routes.ts having no unit coverage).
// Runs a real minimal Express server on an ephemeral port and drives it with
// real HTTP requests, so this exercises Express's actual trust-proxy/
// proxy-addr resolution, not a mock of it.
import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import http, { type Server } from "http";

function startServer(trustProxySetting: number | boolean | undefined): Promise<{ server: Server; port: number }> {
  const app = express();
  if (trustProxySetting !== undefined) {
    app.set("trust proxy", trustProxySetting);
  }
  app.get("/whoami", (req, res) => {
    res.json({ ip: req.ip, protocol: req.protocol, secure: req.secure });
  });
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, port });
    });
  });
}

function get(port: number, headers: Record<string, string>): Promise<{ ip: string; protocol: string; secure: boolean }> {
  return new Promise((resolve, reject) => {
    http
      .request({ hostname: "127.0.0.1", port, path: "/whoami", method: "GET", headers }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject)
      .end();
  });
}

let activeServer: Server | undefined;

afterEach(() => {
  activeServer?.close();
  activeServer = undefined;
});

describe("trust proxy = 1 (the deployed Render configuration)", () => {
  it("takes req.ip from a single-hop X-Forwarded-For instead of the socket address", async () => {
    const { server, port } = await startServer(1);
    activeServer = server;

    const result = await get(port, { "X-Forwarded-For": "203.0.113.5" });
    expect(result.ip).toBe("203.0.113.5");
  });

  it("takes req.protocol/req.secure from X-Forwarded-Proto", async () => {
    const { server, port } = await startServer(1);
    activeServer = server;

    const result = await get(port, { "X-Forwarded-For": "203.0.113.5", "X-Forwarded-Proto": "https" });
    expect(result.protocol).toBe("https");
    expect(result.secure).toBe(true);
  });

  it("with a spoofed two-entry chain, resolves to the address Render's own proxy appended (not the attacker-supplied prefix)", async () => {
    // A client could send its own X-Forwarded-For before ever reaching
    // Render; Render's proxy then appends the real connecting IP, producing
    // "<attacker-claimed-ip>, <real-client-ip>". Trusting exactly 1 hop must
    // resolve to the real (rightmost, proxy-appended) IP, not the
    // attacker-controlled prefix - proving `1` is safe where `true` (trust
    // the whole chain) would not be.
    const { server, port } = await startServer(1);
    activeServer = server;

    const result = await get(port, { "X-Forwarded-For": "9.9.9.9, 203.0.113.5" });
    expect(result.ip).toBe("203.0.113.5");
    expect(result.ip).not.toBe("9.9.9.9");
  });
});

describe("trust proxy unset (previous/default behavior, for contrast)", () => {
  it("ignores X-Forwarded-For and reports the raw socket address instead of the real client IP", async () => {
    const { server, port } = await startServer(undefined);
    activeServer = server;

    const result = await get(port, { "X-Forwarded-For": "203.0.113.5" });
    expect(result.ip).not.toBe("203.0.113.5");
    // Loopback socket address, exactly the "every request looks like it
    // comes from the proxy" problem this fix corrects.
    expect(["127.0.0.1", "::1", "::ffff:127.0.0.1"]).toContain(result.ip);
  });

  it("ignores X-Forwarded-Proto and reports the raw (unencrypted) connection protocol", async () => {
    const { server, port } = await startServer(undefined);
    activeServer = server;

    const result = await get(port, { "X-Forwarded-Proto": "https" });
    expect(result.protocol).toBe("http");
    expect(result.secure).toBe(false);
  });
});
