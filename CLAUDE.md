# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ChatBoatAI — a multi-tenant WhatsApp broadcasting / conversation platform on the Meta
WhatsApp Business (Cloud) API. Users connect WhatsApp Business numbers, manage templates,
run paced bulk broadcast campaigns, and handle two-way conversations from one dashboard.
Billing is paid Razorpay subscriptions (no free trial; accounts without a plan are read-only).

**Naming:** all user-facing text says "ChatBoatAI". Some non-user-visible identifiers still
say `sampark` on purpose (the `package.json` name, Resend sender, `support@`/`info@`/`billing@`
addresses). Lineage: Convora → Chat Stream → Sampark → ChatBoatAI.

## Commands

```bash
npm run dev            # dev server: Express + Vite middleware (HMR) on ONE port, http://localhost:5000
npm run build          # script/build.ts: vite client build -> dist/public, esbuild server bundle -> dist/index.cjs
npm start              # production: runs `drizzle-kit push` THEN node dist/index.cjs
npm run check          # tsc type-check, no emit (the only "lint")
npm test               # vitest run (all *.test.ts, node environment)
npm run test:watch     # vitest watch
npm run db:push        # sync shared/schema.ts to the database (no migration files are generated)
npm run db:indexes     # script/ensureIndexes.ts — create perf indexes / counter columns (also runs on boot)
npm run db:backfill-counters   # one-off recompute of denormalized account counters
npm run ngrok          # expose :5000 for Meta webhook testing
npm run test:queue     # broadcast-queue load test against a mock drain
```

Run one test file / case:

```bash
npx vitest run server/phone.test.ts
npx vitest run -t "normalizePhone"
```

Only four files have tests: `server/phone.test.ts`, `server/planLimits.test.ts`,
`shared/billingPlans.test.ts`, `shared/upgradePricing.test.ts`. `routes.ts`/`storage.ts`
have no unit coverage — verify changes there by running the app.

Environment: Windows, PowerShell is the primary shell. Only `DATABASE_URL` + `SESSION_SECRET`
are required to boot; every other env var gates an optional feature (see `.env.example` / README).

## Architecture

### Layout — one app, three roots

- `client/` — React 18 SPA (Vite 7), source in `client/src`
- `server/` — Express 5 API + WebSocket, run with `tsx` in dev, esbuild-bundled for prod
- `shared/` — Drizzle schema, generated Zod schemas, and **pure billing/pricing math** imported
  by both client and server (`billingPlans.ts`, `upgradePricing.ts`)

Path aliases `@` → `client/src`, `@shared` → `shared`, `@db` → `server/db.ts`,
`@assets` → `attached_assets` are declared **three times** — `vite.config.ts`,
`vitest.config.ts`, `tsconfig.json` — keep them in sync.

### Server boot order (`server/index.ts`) — order is load-bearing

Security headers → host routing → `/healthz` → JSON body parser (15 MB limit, captures
`req.rawBody` for webhook signatures) → request logger → then an async IIFE:
`setupAuth` → `registerAuthRoutes` → `registerRoutes` → (non-blocking) ensure indexes +
backfill counters → start BullMQ broadcast workers → error handler → **Vite/static catch-all** →
`listen`. Any route added after the Vite/static catch-all will not match — register API
routes inside `registerRoutes`.

Process-level `unhandledRejection` / `uncaughtException` handlers log and keep the process
alive deliberately (one bug must not take down every tenant). Each logged one is still a real
bug to fix at the source. Note: `log()` in `server/index.ts` currently never prints (known no-op).

### API + storage

- `server/routes.ts` is a ~5500-line monolith holding every `/api/*` endpoint and creating the
  `WebSocketServer` on `/ws`.
- All DB access goes through the `storage` singleton (`DatabaseStorage implements IStorage`,
  `server/storage.ts`) using Drizzle. Storage mutations also bump **denormalized rollup
  counters** via `server/counters.ts` helpers — don't write rows in a way that bypasses these
  or dashboard/campaign counts drift (`npm run db:backfill-counters` repairs drift).

### Database

- Schema: `shared/schema.ts`, which `export *`s `shared/models/auth.ts` (`users`, `sessions`,
  `pageViews`, `adminAuditLog`). Zod insert schemas via `drizzle-zod`.
- Change flow: edit schema → `npm run db:push`. **No migration files** are committed despite
  `drizzle.config.ts` naming a `migrations/` dir; prod `npm start` runs `db:push` on every deploy.
- Performance indexes are **not** in the schema — they're created imperatively in
  `script/ensureIndexes.ts`, run on every boot and via `npm run db:indexes`.
- Sessions stored in Postgres (`connect-pg-simple`).

### Auth & authorization

- Passport, session-cookie based. `server/auth/`: `localAuth.ts` (email/password, bcrypt) is
  primary; `facebookAuth.ts` serves both "Log in with Facebook" and the WhatsApp embedded-signup
  OAuth connect flow. `singleSession.ts` enforces one active session per user.
- `isAuthenticated` middleware guards routes; the user id is `req.user.claims.sub`.
- Layered gates (return specific status codes the client's `apiRequest` surfaces as messages):
  `requireActiveSubscription` / `blockUnpaidWrites` → 402 paywall (team members use the
  owner's plan),
  `requireVerifiedEmail` → 403, and `server/planLimits.ts` quota assertions
  (`assertCanSendMessages`, `assertCanAddContacts`, …).
- `role === "super_admin"` bypasses most gates and is force-routed to `/admin` (client `App.tsx`).
- CSRF: session synchronizer token, enforced **only** on `/api/admin/*` and admin
  change-password (`server/csrf.ts`). The client (`client/src/lib/queryClient.ts`) fetches
  `/api/csrf-token` once and attaches `X-CSRF-Token` to every non-GET request automatically.

### Multi-tenancy

- **Host split** (`server/hostRouting.ts` + client `App.tsx`): marketing/login on the root
  domain, authenticated app on `app.<PRIMARY_DOMAIN>`. Entirely no-op until `PRIMARY_DOMAIN`
  is set, so localhost / `*.onrender.com` work as a single origin.
- **Active WhatsApp account**: a user may have multiple connected numbers; `getActiveAccount(req)`
  resolves the current one, and contacts / lists / tags / conversations / notifications are
  scoped by `accountId`. Team members can share accounts.

### WhatsApp integration

- `server/whatsapp-api.ts` — direct Meta Graph API. Messaging/media/template-listing use
  **v21.0**; template *creation* is pinned to **v19.0** (documented Meta bug workaround).
- Webhooks at `/api/webhook` (GET verify, POST message/status). On boot the server
  re-subscribes every connected WABA to webhooks — **running `npm run dev` with real
  credentials in `.env` makes live production calls to Meta.**

### Broadcast queue (`server/queues/`)

BullMQ, requires Redis (`REDIS_URL` or `UPSTASH_REDIS_REST_*`). Per-account queues with a
`FairBroadcastDispatcher` that round-robins a capped worker pool
(`MAX_CONCURRENT_ACCOUNT_WORKERS`) so one large campaign can't starve other tenants. Runs
in-process. Without Redis the app runs fine, just with queued broadcasts disabled.

### Realtime

`ws` server on `/ws`. `server/realtime.ts` `broadcast(event, data)` is a shared fan-out used by
both HTTP routes and queue workers. Client `useRealtimeSync` invalidates React Query caches on
events and also polls a handful of keys every 30s as a fallback.

### Media storage

`server/uploadStorage.ts` — Cloudflare R2 (S3-compatible) when configured, otherwise base64 in
Postgres. Always served back through the app at `/uploads/db/:id`, never directly from R2.
WhatsApp size limits enforced on upload (5 MB image / 16 MB video / 100 MB document).

### Billing / email

- Razorpay: `server/razorpay.ts`, `billingPayments.ts`, `billingPlans.ts`,
  `subscriptionLifecycle.ts`. Plans + payments tables are seeded/ensured on boot. Pure pricing
  math lives in `shared/` and is unit-tested.
- Resend (`server/email.ts`) for verification + contact-form email.

### Frontend

- `wouter` for routing (not react-router). TanStack Query configured with `staleTime: Infinity`,
  no refetch-on-focus, no retry — mutations must invalidate deliberately.
- shadcn/ui (Radix) + Tailwind; React Hook Form + Zod.
- `client/src/App.tsx` `AppContent` chooses the shell by auth state: `PublicRouter` (logged out),
  `AdminApp` (super_admin), `AuthenticatedApp` (normal user). `data-testid` attributes are used
  throughout for element targeting.

## Deploy

Target is Render (`/healthz` health check eliminates deploy-window 502s); `ecosystem.config.cjs`
supports PM2; `.replit` configures Replit autoscale. See `DEPLOY.md` / `CLOUD_DEPLOY.md`.
