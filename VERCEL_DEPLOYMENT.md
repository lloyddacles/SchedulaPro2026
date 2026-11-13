# Vercel Deployment Guide (SchedulaPro 2026) — Static Demo Mode

This repo is prepared for easy Vercel deployment **without an external database**.
- **Data:** bundled static/demo data (`backend/data/demoData.js`) via a mock DB adapter (`backend/config/db.ts`)
- **Persistence:** none — changes are not saved across reloads, redeploys, or serverless cold starts
- **Architecture:** Vercel **services** project (`vercel.json`): `backend` (Express, `backend/`) and `frontend` (Vite, `frontend/`) with rewrites `/api/(.*)` → backend, `/(.*)` → frontend

## 1) No database setup required
You do **not** need to provision MySQL/TiDB/Postgres or run seeds/migrations for this demo mode.

## 2) Connect Git to Vercel
1. Vercel → **Add New → Project → Import Git Repository** → select `lloyddacles/SchedulaPro2026` (branch `main`).
2. `vercel.json` defines the multi-service configuration and public rewrites; Vercel will detect/build services from their roots.
3. **Node.js Version:** 18+ (see `package.json` engines).
4. If needed, confirm per-service install/build behavior in Vercel (services are built independently).

## 3) Set Environment Variables in Vercel
In Vercel → Project → **Settings → Environment Variables**, add:

| Variable | Required | Example / notes |
|---|---|---|
| `NODE_ENV` | Recommended | `production` |
| `JWT_SECRET` | Yes | Long random secret (required for auth tokens/cookies) |
| `FRONTEND_URL` | Yes | `https://<your-project>.vercel.app` (actual deployed origin) |
| `VERCEL` | Usually auto | `1` (app treats runtime as serverless; Socket.IO mocked) |

**Not required in demo mode:** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`.  
**Optional (only if you use email/OTP features):** `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `FROM_EMAIL`.

You can import **`import.env`** from the repo as a starting point, then update `FRONTEND_URL` to your real Vercel URL.

## 4) Deploy & verify
- Deploy (on import or push to `main`).
- Verify:
  - Frontend loads and SPA routes work
  - API responds at `/api/*`
  - Login works with demo accounts: `admin` / `admin123`, `programhead` / `admin123`, `faculty` / `admin123`
  - Pages render bundled demo data
- Expect limitations: data changes are **not persisted**; realtime websockets are not persistent on serverless.

## Notes
- **Services & routing:** `backend` and `frontend` are exposed via top-level rewrites in `vercel.json`. There are no internal service-to-service bindings; the browser calls the API at `/api`.
- **Local run:** `npm run install-all` then `npm run dev` (set `JWT_SECRET`/`FRONTEND_URL` in `backend/.env` if needed).
- **To restore a real database later:** replace `backend/config/db.ts` with a real DB client/pool, reintroduce `DB_*` env vars, and run schema/seed/migrations as appropriate.
