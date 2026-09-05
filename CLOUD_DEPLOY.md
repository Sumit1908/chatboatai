# Deploying to Hostinger Cloud Hosting (no VPS)

This path targets Hostinger **Cloud/Business hosting** (the hPanel you already
have — "Cloud Startup" plan), which runs Node apps through Hostinger's own
managed Node.js application manager rather than giving you root SSH + Nginx.
Because of that, the deployment mechanics are different from a VPS:

- No custom Nginx config, no PM2 — Hostinger's panel supervises the Node
  process for you (`ecosystem.config.cjs` in this repo is unused on this path;
  keep it only in case you move to a VPS later).
- **WebSocket upgrades are not reliably proxied** on this tier, so the app's
  real-time layer was switched from a WebSocket push to periodic polling
  (`client/src/hooks/use-realtime-sync.ts`, replacing the old
  `use-websocket.ts`). Nothing else changed — the dashboard/messages/templates
  refresh every ~8s instead of instantly, and the Inbox page already polled
  independently (5-10s) so it's unaffected.
- Database stays on **Neon** (cloud Postgres) regardless — Cloud hosting's
  built-in databases are MySQL only, so `DATABASE_URL` keeps pointing at Neon.

## 1. Create the Node.js application in hPanel

1. hPanel → **Websites** → pick (or add) the domain you want to use for this
   app → its **Dashboard**.
2. Look for **Advanced → Node.js** (sometimes surfaced as "Web Apps" →
   Node.js in the sidebar you're on now). Click **Create Application**.
3. Fill in:
   - **Node.js version**: 20.x
   - **Application mode**: Production
   - **Application root**: the folder you'll upload the code to (e.g.
     `whatsapp-broadcast`) — do not use `public_html` directly if the panel
     also serves static files from there for the same domain.
   - **Application URL**: your domain (e.g. `yourdomain.com`)
   - **Application startup file**: `dist/index.cjs`
4. Save. The panel will show an SSH-like "Enter to virtual environment"
   command and an **environment variables** section — use the latter (not a
   `.env` file) to set:
   - `APP_URL=https://yourdomain.com`
   - `DATABASE_URL=` your Neon connection string
   - `SESSION_SECRET=` output of `openssl rand -hex 32`
   - `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` — from your Meta App
   - `NODE_ENV=production`
   - `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` — optional, from Cloudflare R2 (see comments in `.env.example`); uploaded media falls back to database storage if left unset

## 2. Upload the code

Use the SSH access Hostinger gives you for this application (shown in the
Node.js app screen), or Git via hPanel's Git integration if available:

```bash
# from the "Enter to virtual environment" SSH command hPanel gives you:
cd ~/whatsapp-broadcast   # your application root
git clone <your-repo-url> .
# or upload/rsync a zip via File Manager and unzip
```

## 3. Install, build, migrate

Inside that same virtual environment shell (it pins the right Node/npm
version for you):

```bash
npm install
npm run build        # dist/public (client) + dist/index.cjs (server)
npm run db:push       # creates/updates tables in Neon
```

## 4. Start / restart the app

Back in hPanel's Node.js application screen, click **Restart**. Hostinger's
Passenger-based process manager takes it from there — it starts
`dist/index.cjs`, restarts it if it crashes, and routes `https://yourdomain.com`
traffic to it (both the API and the built frontend, since this server serves
both from one process).

Verify: visit `https://yourdomain.com`, confirm the landing page loads, click
**Log In**, complete the Facebook OAuth prompt, and confirm you land back on
the dashboard authenticated.

## 5. Redeploying after code changes

```bash
cd ~/whatsapp-broadcast
git pull
npm install
npm run build
```

Then click **Restart** on the Node.js app in hPanel.

## 6. Meta App configuration

Same as the VPS path — see **DEPLOY.md, section 10** for the exact fields
(OAuth redirect URI, webhook URL, App Domains, switching the app to Live
mode). Just use this Cloud hosting domain wherever it says `yourdomain.com`.

## If something doesn't route correctly

If `https://yourdomain.com` shows a default Hostinger/Apache page instead of
your app, the domain's document root is still pointed at `public_html`
instead of the Node app — go back to the Node.js application settings and
confirm the **Application URL** is bound to the domain (not a subpath), and
that no static `index.html` exists in `public_html` for that domain.

## What if this tier turns out to be too limiting?

If uploads, build times, or the polling-based updates feel too constrained on
Cloud hosting, the fallback is a Hostinger VPS (KVM 1 is usually the cheapest
tier) — `DEPLOY.md` in this repo is written and tested for that path, and the
real-time WebSocket layer can be restored if you move there later.
