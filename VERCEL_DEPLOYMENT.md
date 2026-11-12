# Vercel Deployment Guide (SchedulaPro 2026)

This repo is prepared to deploy on Vercel as:
- **Frontend**: Vite/React static build from `frontend/` (output `frontend/dist`)
- **API**: Serverless function at `api/index.ts` (wraps `backend/server.ts`) via `vercel.json`

> **What I cannot do for you:** create a Vercel project/account, provision a database, set secrets in Vercel, or run `seed` against your production database (requires your DB credentials). Complete those steps below, then connect this GitHub repo to Vercel.

## 1) Provision a MySQL-compatible database (required)
The app uses **MySQL (`mysql2`)** with raw SQL. For the least-effort deploy, use a **MySQL-compatible** provider (no code rewrite):
- Examples: **TiDB Cloud Serverless** (free tier), Railway, Aiven, or any MySQL host
- Collect: `DB_HOST`, `DB_PORT` (usually `3306`), `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Enable/require TLS if available and set `DB_SSL=true`

## 2) Initialize the database (run once against the cloud DB)
From your local machine, with credentials for the cloud DB:

1. Copy root `.env.example` values into `backend/.env` (or export env vars) and set the cloud DB credentials + `JWT_SECRET` etc.
2. Install and seed:
   ```bash
   npm run install-all
   npm run seed
   ```
3. If needed for your data/state, run additional migrations:
   - scripts in `backend/migrate*.js` / `backend/migrations/`
   - or `npm run migrate:live` (runs `backend/scripts/migrate_data.js`)

> Run these against the same database your Vercel app will use.

## 3) Connect Git to Vercel
1. In Vercel: **Add New → Project → Import Git Repository** → select `lloyddacles/SchedulaPro2026` (branch `main`).
2. **Framework Preset:** Other (repo uses custom `vercel.json` builds/rewrites).
3. **Root Directory:** repository root (leave default).
4. **Build & Output Settings:** `vercel.json` defines builds (`api/index.ts` with `@vercel/node`, static build with `distDir` `frontend/dist`). If Vercel asks, you can use:
   - Install Command: `npm run install-all` (if default install misses workspace deps)
   - Build Command: `npm run build`
   - Output Directory: leave unset / handled by `vercel.json` (`frontend/dist`)
5. **Node.js Version:** 18+ (see `package.json` engines).

## 4) Set Environment Variables in Vercel
In Vercel → Project → **Settings → Environment Variables**, add for **Production** (and **Preview** if desired):

| Variable | Required | Example / notes |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `DB_HOST` | Yes | MySQL host |
| `DB_PORT` | Yes | `3306` (or provider value) |
| `DB_USER` | Yes | DB username |
| `DB_PASSWORD` | Yes | DB password |
| `DB_NAME` | Yes | Database name |
| `DB_SSL` | Recommended | `true` if provider requires TLS |
| `JWT_SECRET` | Yes | Long random secret |
| `FRONTEND_URL` | Yes | `https://<your-project>.vercel.app` (your production URL) |
| `VERCEL` | Usually auto | `1` (disables persistent Socket.IO for serverless) |

**Optional (if used):** `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `FROM_EMAIL` for OTP/notifications.

> Never commit secrets. `.env*` files are gitignored.

## 5) Deploy & verify
- Deploy (Vercel will build on connect/push to `main`).
- Check:
  - Frontend loads and SPA routes work (`/` rewrites to `index.html`)
  - API responds at `/api/*` (rewritten to `api/index.ts`)
  - Login/auth works (set `FRONTEND_URL` to the exact deployed origin; cookies require correct origin/HTTPS/proxy handling—already configured in `backend/server.ts`)
  - Core data flows work against the seeded cloud DB

## Notes / limitations
- **Realtime:** Socket.IO is mocked in serverless (`VERCEL` env) in `backend/server.ts`, so persistent websocket realtime is not available on Vercel serverless; HTTP features should work.
- **DB connections:** serverless functions can open many connections under load; use a provider/pooler suited for serverless if you see connection limits.
- **Changing DB type:** moving to Postgres/Neon or Turso requires significant driver/SQL/schema/migration refactoring (see `README.md`).

## Troubleshooting
- **Build fails:** review Vercel build logs; ensure workspace deps install (`npm run install-all`) and output is `frontend/dist`.
- **DB/auth errors:** verify env vars, `DB_SSL`, network/TLS requirements, and that schema is seeded.
- **CORS/cookie issues:** confirm `FRONTEND_URL` matches the site URL exactly and redeploy after env changes.
