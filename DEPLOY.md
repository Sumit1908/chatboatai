# Deploying to Hostinger (VPS) + Facebook/Meta setup

This app is a Node.js/Express server (with a WebSocket endpoint at `/ws`) serving a
built React frontend, backed by PostgreSQL. It needs a plan that can run a
persistent Node process — a Hostinger **VPS** (not shared/cPanel hosting).

## 1. Provision the VPS

1. Buy a Hostinger VPS plan (Ubuntu 22.04 template is easiest).
2. Point your domain's DNS **A record** at the VPS IP address (in hPanel or
   wherever your domain is registered). Wait for propagation (`dig yourdomain.com`).
3. SSH in: `ssh root@YOUR_VPS_IP`

## 2. Install system packages

```bash
apt update && apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PM2 (keeps the app alive, restarts on crash/reboot)
npm install -g pm2

# Nginx (reverse proxy + TLS termination)
apt install -y nginx

# Certbot (free SSL)
apt install -y certbot python3-certbot-nginx

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 3. Get the code onto the server

```bash
mkdir -p /var/www/whatsapp-broadcast
cd /var/www/whatsapp-broadcast
git clone <your-repo-url> .
# or: scp -r a local build up with rsync
```

## 4. Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in:
- `APP_URL` — `https://yourdomain.com` (must match exactly what you register with Meta)
- `DATABASE_URL` — your Neon Postgres connection string (Dashboard → Connection Details)
- `SESSION_SECRET` — generate with `openssl rand -hex 32`
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` — from your existing Meta App (Settings → Basic)
- `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` — optional, from Cloudflare R2 (see comments in `.env.example`); uploaded media falls back to Postgres storage if left unset

## 5. Install, build, migrate

```bash
npm ci
npm run build          # builds client (dist/public) + server (dist/index.cjs)
npm run db:push         # creates/updates tables in your Neon database
mkdir -p uploads
```

## 6. Start with PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup             # follow the printed command to enable on-boot restart
```

Check it's alive: `pm2 status`, `pm2 logs whatsapp-broadcast`, `curl localhost:5000`.

## 7. Nginx reverse proxy (with WebSocket support)

Create `/etc/nginx/sites-available/whatsapp-broadcast`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/whatsapp-broadcast /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 8. Enable HTTPS

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot edits the Nginx config to add the SSL block and sets up auto-renewal.
Your site is now live at `https://yourdomain.com`, proxied to the Node app,
with WebSockets working for the real-time dashboard/inbox features.

## 9. Redeploying after code changes

```bash
cd /var/www/whatsapp-broadcast
git pull
npm ci
npm run build
pm2 restart whatsapp-broadcast
```

---

## 10. Meta App configuration (Facebook Login + WhatsApp Business)

You said you already have a Meta App with `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET`.
It needs to be configured for the **new domain**:

Go to [developers.facebook.com](https://developers.facebook.com) → your App:

1. **Settings → Basic**
   - App Domains: `yourdomain.com`
   - Privacy Policy URL: `https://yourdomain.com/privacy`
   - Terms of Service URL: `https://yourdomain.com/terms`

2. **Add product → Facebook Login → Settings**
   - Valid OAuth Redirect URIs: `https://yourdomain.com/api/callback`
   - Client OAuth Login: On
   - Web OAuth Login: On

3. **WhatsApp product** (should already be added, since embedded signup/OAuth
   connect flow already exists in this codebase — see `server/routes.ts`):
   - Webhook callback URL: `https://yourdomain.com/api/webhook`
   - Verify token: whatever you set in the app's Settings page (Webhook Verify
     Token field) — or let the app auto-register it via the in-app
     "Subscribe to Webhook Events" action, which calls
     `registerWebhookWithMeta` in `server/whatsapp-api.ts` for you.
   - Webhook fields to subscribe: `messages`, `message_template_status_update`

4. **App Mode: Live**
   - While the app is in "Development" mode, only users added as
     Admins/Developers/Testers on the App Dashboard can log in with Facebook
     or connect WhatsApp numbers.
   - To let the public log in, switch the app to **Live** mode (top of the
     dashboard). This requires the Privacy Policy/Terms URLs above and,
     for WhatsApp Business API access at scale, **Meta Business
     Verification** (Business Settings → Security Center → Start Verification).
   - `email` and `public_profile` (used by Facebook Login here) are standard
     permissions that don't require App Review, so login itself works
     immediately once the app is Live.

5. Test end to end: visit `https://yourdomain.com`, click **Log In**, complete
   the Facebook OAuth prompt, confirm you land back on the dashboard
   authenticated. Then check the in-app Settings page to connect/re-verify a
   WhatsApp Business number against the new domain's webhook URL.

## What changed in the code for this migration

- Replaced Replit's OIDC login (`replit.com/oidc`, required `REPL_ID`, only
  worked inside Replit) with a standalone **Facebook Login** using
  `passport-facebook` — see `server/auth/facebookAuth.ts`. Routes
  (`/api/login`, `/api/callback`, `/api/logout`, `/api/auth/user`) kept the
  same paths/shape, so no frontend changes were needed.
- Added `dotenv` so the server reads a `.env` file (Replit injected secrets as
  env vars automatically; a VPS needs this explicitly).
- Added `.env.example`, `ecosystem.config.cjs` (PM2), and this guide.
- The existing WhatsApp Business Facebook OAuth/embedded-signup flow and
  webhook handling (`server/routes.ts`, `server/whatsapp-api.ts`) were already
  fully built and needed no code changes — only the Meta App dashboard
  configuration above.
