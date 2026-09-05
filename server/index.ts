import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./auth";
import { registerSecurityAndCanonicalMiddleware } from "./security";
import { registerHostRouting } from "./hostRouting";

// Without these, a single unhandled error anywhere in the app - a bad
// webhook payload, a failed Meta API call in a fire-and-forget send loop,
// anything - crashes the entire Node process for every tenant at once
// (Node 15+ terminates the process on an unhandled promise rejection by
// default). Logging and staying up trades "possibly-inconsistent state
// after one bad async path" for "no more full-app outages from one bug" -
// worth it while running multiple paying customers on a single instance.
// Watch these logs: each one here is a real bug that should still get
// fixed at its source, this just stops it taking the whole app down.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

const app = express();
const httpServer = createServer(app);

registerSecurityAndCanonicalMiddleware(app);
registerHostRouting(app);

// Dedicated health check target for Render (Settings -> Health Check Path).
// Registered before any other middleware so it never waits on auth/session
// setup and does no DB work - Render polls this on the new instance before
// cutting traffic over during a deploy, which is what eliminates the
// ~30-90s window of 502s every deploy currently causes.
app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    // Default 100kb is too small for bulk contact imports (e.g. 2500+
    // contacts as JSON easily exceeds it), which failed silently with a
    // generic error before even reaching the route handler.
    limit: "15mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "15mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    // Only keep a tiny summary for logs — stringifying full template/contact
    // payloads on every response was blocking the event loop and making the
    // whole API feel slow under normal UI navigation.
    if (bodyJson == null) {
      capturedJsonResponse = undefined;
    } else if (Array.isArray(bodyJson)) {
      capturedJsonResponse = { type: "array", length: bodyJson.length };
    } else if (typeof bodyJson === "object") {
      const keys = Object.keys(bodyJson);
      capturedJsonResponse = {
        keys: keys.slice(0, 12),
        ...(typeof (bodyJson as any).error === "string" ? { error: (bodyJson as any).error } : {}),
        ...(typeof (bodyJson as any).message === "string" ? { message: (bodyJson as any).message } : {}),
      };
    } else {
      capturedJsonResponse = { value: String(bodyJson).slice(0, 120) };
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Setup authentication BEFORE registering other routes
  await setupAuth(app);
  registerAuthRoutes(app);
  
  await registerRoutes(httpServer, app);

  // Ensure indexes + counter columns exist, then backfill rollups once.
  // Non-blocking for request serving — runs after routes are up.
  void (async () => {
    try {
      const { ensureSchemaPerformance } = await import("../script/ensureIndexes");
      await ensureSchemaPerformance();
      log("db indexes/columns ensured");
      const { backfillAccountCounters } = await import("./counters");
      await backfillAccountCounters();
      log("account counter backfill complete");
    } catch (err: any) {
      console.error("[db] ensure/backfill failed:", err.message);
    }
  })();

  // BullMQ fair workers (per-account queues + round-robin dispatcher).
  // Runs in-process on the same Render instance; Redis holds the backlog
  // so restarts no longer lose in-flight audience arrays in memory.
  const { startBroadcastWorkers, isQueueEnabled } = await import("./queues");
  if (isQueueEnabled()) {
    startBroadcastWorkers();
    log("broadcast queue workers started");
  } else {
    log("broadcast queue disabled (set REDIS_URL or UPSTASH_REDIS_*)");
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
