# ChatbotAI

A WhatsApp broadcasting and conversation management platform built on the
Meta WhatsApp Business (Cloud) API. Users connect one or more WhatsApp
Business numbers, manage message templates, run bulk broadcast campaigns to
contact lists, and handle two-way conversations from a single dashboard.

> **Note on naming:** all user-facing text (page titles, nav/footer, SEO
> metadata, emails, error/paywall messages, etc.) now reads "ChatBoatAI".
> A few purely technical, non-user-visible identifiers still say `sampark`
> on purpose: the `package.json` package name, the Resend
> transactional-email sender address, and the `support@`/`info@`/`billing@`
> contact email addresses (all pending a decision on the new domain's
> mailboxes) — see git history for the full previous naming lineage
> (`Convora → Chat Stream → Sampark → ChatBoatAI`).

## Architecture

### Frontend
- **React 18** + **TypeScript**, built with **Vite 7**
- **wouter** for client-side routing (not React Router)
- **TanStack React Query** for server state/caching
- **shadcn/ui** (Radix UI primitives) + **Tailwind CSS** for UI/styling
- **React Hook Form** + **Zod** (via `@hookform/resolvers`) for forms
- **Recharts** for analytics charts
- Source lives in [client/src](client/src) (`pages/`, `components/`, `hooks/`, `lib/`)

### Backend
- **Express 5** on **Node.js**, written in TypeScript, run directly with `tsx` in dev
- Single entry point: [server/index.ts](server/index.ts)
- REST API under `/api/*`, routes registered in [server/routes.ts](server/routes.ts)
- WebSocket server (`ws`) for real-time UI updates (message status, template/campaign updates)
- Background job processing with **BullMQ** ([server/queues](server/queues)) for
  paced/rate-limited broadcast sending — requires Redis (see below); the app
  runs fine without Redis, just with broadcast queueing disabled
- Source in [server](server): auth, billing (Razorpay), email (Resend),
  object storage, WhatsApp Graph API client, security/host-routing middleware

### Database
- **PostgreSQL**, accessed via `DATABASE_URL`
- **Drizzle ORM** (`drizzle-orm` / `drizzle-kit`), schema in [shared/schema.ts](shared/schema.ts)
- Key tables: `templates`, `campaigns`, `campaign_metrics`, `messages`,
  `whatsapp_accounts`, `contacts`, `contact_lists`, `contact_tags`,
  `conversations`, `conversation_messages`, `notifications`, `activities`,
  `api_settings`, `active_accounts`, `team_members`, `uploaded_files`
- Sessions are stored in Postgres via `connect-pg-simple`

### Authentication
- **Passport.js** with two strategies:
  - `passport-local` (email/password, hashed with `bcryptjs`) — primary
    dashboard login, see [server/auth/localAuth.ts](server/auth/localAuth.ts)
  - `passport-facebook` — used both for "Log in with Facebook" and for the
    WhatsApp Business embedded-signup/OAuth connect flow, see
    [server/auth/facebookAuth.ts](server/auth/facebookAuth.ts)
- Session-based auth (cookie + Postgres-backed session store)

### WhatsApp integration
- Direct integration with the **Meta Graph API** (WhatsApp Business Cloud
  API), see [server/whatsapp-api.ts](server/whatsapp-api.ts)
- Messaging/media/template-listing calls use Graph API v21.0; template
  *creation* is pinned to v19.0 (documented workaround for a Meta API issue)
- Incoming webhooks at `/api/webhook` (GET for verification, and message/status webhooks)
- On startup the server re-subscribes each connected WhatsApp Business
  Account (WABA) to webhooks — **this makes live calls to Meta using
  whatever credentials are in your `.env`**, so running `npm run dev` against
  a `.env` with real, already-connected WABAs will hit production Meta APIs

### File / media storage
- Uploaded template and campaign media: optional **Cloudflare R2** (S3-compatible,
  via `@aws-sdk/client-s3`); if R2 env vars are not set, uploads fall back to
  being stored as base64 in Postgres

### Payments
- **Razorpay** for subscription billing (plans, payments, webhooks)

### Email
- **Resend** for transactional email (e.g. verification)

## Required environment variables

Copy [.env.example](.env.example) to `.env` and fill in real values. Names
only (see the file for descriptions of each):

| Variable | Required? | Purpose |
|---|---|---|
| `NODE_ENV` | yes | `development` or `production` |
| `PORT` | no (defaults to 5000) | HTTP port |
| `APP_URL` | yes | Public root URL; used for OAuth callback + canonicalization |
| `PRIMARY_DOMAIN` | no | Root domain for marketing/app subdomain split |
| `COOKIE_DOMAIN` | no | Shared session cookie domain (must start with `.`) |
| `VITE_PRIMARY_DOMAIN` | no | Client-side copy of `PRIMARY_DOMAIN` |
| `VITE_GA_MEASUREMENT_ID` | no | Google Analytics 4 |
| `DATABASE_URL` | **yes** | PostgreSQL connection string |
| `SESSION_SECRET` | **yes** | Session cookie signing secret |
| `FACEBOOK_APP_ID` | yes (for FB login / WhatsApp connect) | Meta App ID |
| `FACEBOOK_APP_SECRET` | yes (for FB login / WhatsApp connect) | Meta App secret |
| `RAZORPAY_KEY_ID` | yes (for billing) | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | yes (for billing) | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | yes (for billing webhooks) | Razorpay webhook signing secret |
| `R2_ACCOUNT_ID` | no | Cloudflare R2 account ID (media storage) |
| `R2_ACCESS_KEY_ID` | no | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | no | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | no | Cloudflare R2 bucket name |
| `UPLOAD_STORAGE_BACKEND` | no | Set to `postgres` to force DB storage instead of R2 |
| `REDIS_URL` | no | Redis connection string for BullMQ broadcast queue |
| `UPSTASH_REDIS_REST_URL` | no (alt. to `REDIS_URL`) | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | no (alt. to `REDIS_URL`) | Upstash REST token |

Only `DATABASE_URL` and `SESSION_SECRET` are strictly required to boot the
server; everything else gates an optional feature (Facebook login/WhatsApp
connect, billing, R2 storage, broadcast queueing) that degrades gracefully
when unset.

## Local installation

```bash
npm install
cp .env.example .env
# edit .env — at minimum set DATABASE_URL and SESSION_SECRET
```

Database setup (requires `DATABASE_URL` to already point at a reachable
Postgres instance):

```bash
npm run db:push          # sync Drizzle schema to the database
npm run db:indexes       # ensure performance indexes/columns exist
```

## Development

```bash
npm run dev
```

Runs the Express server (`server/index.ts` via `tsx`) with Vite in
middleware mode for HMR. Serves both the API and the client on a single
port — **http://localhost:5000** by default (`PORT` env var to override).

## Production build & start

```bash
npm run build   # Vite client build + esbuild server bundle -> dist/
npm start       # NODE_ENV=production node dist/index.cjs
```

`ecosystem.config.cjs` is provided for running the production build under
PM2.

## Other scripts

| Script | Purpose |
|---|---|
| `npm run check` | TypeScript type-check (`tsc`, no emit) |
| `npm test` | Run the Vitest test suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run ngrok` | Expose local port 5000 via ngrok (for Meta webhook testing) |
| `npm run db:backfill-counters` | One-off backfill of account counters |
| `npm run test:queue` | Load-test the broadcast queue against a mock drain |

## API / server notes

- Health check: `GET /healthz` (used by hosting platforms for zero-downtime deploys)
- WhatsApp webhook: `GET/POST /api/webhook`
- All application data endpoints are under `/api/*`; see [server/routes.ts](server/routes.ts)
  for the full list (accounts, campaigns, contacts, templates, notifications,
  conversations, messages, analytics, admin, billing/subscription)
- Uploaded media is served back through the app itself at `/uploads/db/:id`
  (never exposed directly from R2)

## Known / pre-existing items (not fixed in this pass)

- The `log()` helper in [server/index.ts](server/index.ts) computes a
  timestamp but never actually prints it — request logging to the console
  is currently a no-op. Pre-existing behavior; left as-is since fixing it
  is an app-code change outside this audit's scope.
- `script/build.ts` lists several packages in its esbuild "keep bundled"
  allowlist (e.g. `axios`, `stripe`, `openai`, `cors`) that are not in
  `package.json` and are not imported anywhere in the codebase — harmless
  leftovers from an earlier boilerplate, not currently causing any issue.
- The production client bundle has one chunk over Vite's 500kB warning
  threshold (~2MB unminified / ~546kB gzipped). Build succeeds; this is a
  performance note, not an error.
