# SchedulaPro 2026: Faculty Teaching Load Scheduling System 🏫📊

> **An Enterprise-Grade Academic Orchestration Platform designed for Institutional Excellence.**

---

## 👨‍💻 Architect & Creator

**Mr. Lloyd Christopher F. Dacles, MIS, CITSMP, DBMP, CPAA, ITPO, CDSA**  
*Lead System Architect & Founding Developer*

This system represents a comprehensive synthesis of academic resource management, algorithmic conflict resolution, and enterprise-level auditing, meticulously crafted to solve the complexities of modern institutional scheduling.

---

## 📖 Project Overview

**SchedulaPro 2026** (Faculty Teaching Load Scheduling System) is a robust, full-stack, enterprise-grade web application engineered to significantly streamline, automate, and secure academic scheduling processes. It facilitates a seamless real-time data flow between Program Assistants, Program Heads, and Administrators—allowing institutional bodies to structurally manage teaching assignments, evaluate capacity overloads, generate automated schedule matrices, and perform rigorous audit tracking inherently.

### 🎯 Strategic Objectives
- **Operational Centralization:** A single source of truth for Faculty contracts, Subject curriculums, Section cohorts, and Room capacities.
- **Algorithmic Constraint Enforcement:** Intelligent tracking of faculty teaching limits, co-teaching requirements, and physical room overlaps to eliminate mathematical collisions.
- **Dynamic Scheduling:** A powerful Auto-Scheduler Algorithm paired with an intuitive Drag-and-Drop Master Schedule Matrix.
- **Institutional Security:** Validation of all mission-critical activities through strict Role-Based Access Control (RBAC) and comprehensive immutable Audit Logging.

---

## 🚀 Key Modules & System Features

### 1. 🔐 Security & Identity Management
- **Enterprise RBAC:** Strict partitioning of functionalities across `Admin`, `Program Head`, and `Program Assistant` roles.
- **JWT-Powered Auth:** Secure session management with encrypted token exchange and cross-site cookie protection.
- **Role-Gated Interfaces:** Visual and API-level logic that ensures only authorized personnel can approve loads, purge databases, or modify institutional settings.

### 2. ⚡ The Master Auto-Scheduler & Conflict Manager
- **Core Algorithm:** A high-performance placement engine that evaluates hundreds of constraints (Faculty Blackouts, Facility Capacities, Section Clusters) in seconds.
- **Conflict Resolution Center:** A dedicated panel that identifies "Spectral Orphans" and scheduling bottlenecks, offering "Smart Find" alternatives to resolve deadlocks.
- **Ghost Mode Engineering:** A unique "preview" layer allowing architects to build draft schedules in a virtual matrix before committing changes to the production ledger.

### 3. 📊 Academic Resource Matrix
- **Teaching Load Pipeline:** Real-time visibility into instructor workloads with visual "Load Gauges" (Green/Amber/Red) and automatic 60-hour overload capping.
- **Section & Cohort Management:** Structural organization of students into distinct programs and year levels with precise capacity tracking.
- **Facility Orchestration:** Dynamic room management that enforces "Room Type" constraints (e.g., Computer Labs vs. Lecture Halls) during scheduling.

### 4. 📈 Insight & Compliance
- **Real-Time Dashboard:** Institutional KPI tracking, including load completion percentages and department-level summaries.
- **Immutable Audit Logs:** Deep-tracing logic capturing every modification (`FROM` -> `TO`) with IP, Timestamp, and User metadata.
- **Institutional Reporting:** Professional PDF and CSV export engines for Room Schedules, Faculty Loads, and Master Academic Matrices.

---

## 🛠️ Technology Stack

SchedulaPro 2026 is built on a modern, reactive, and highly scalable monorepo architecture:

### Frontend Layer
- **Environment:** `Vite` + `React.js`
- **State Management:** `@tanstack/react-query` (Asynchronous synchronization)
- **Styling:** `Tailwind CSS` + Glassmorphic Design System
- **Animations:** `Framer Motion` (Micro-interactions)
- **Visuals:** `FullCalendar` + `Lucide Icons`

### Backend Layer
- **Environment:** `Node.js` + `Express.js` (TypeScript)
- **Real-Time Sync:** `Socket.io` (mocked/limited on Vercel serverless)
- **Data:** **Static demo data** bundled in the app (no external database required)
- **Validation:** `Zod` (Schema-level data hardening)
- **Performance:** `Compression` + `HTTP/2` Readiness

---

## ⚙️ Installation & Deployment (Static Demo Mode)

This version runs on **bundled static/demo data** (see `backend/data/demoData.js`, `backend/config/db.ts`) so it can be deployed to Vercel without provisioning a database.
- **No persistence:** logins beyond demo accounts, edits, and created records are **not** saved across reloads, redeploys, or serverless cold starts.
- **Demo logins:** `admin` / `admin123`, `programhead` / `admin123`, `faculty` / `admin123`

### Environment Configuration
Use the root `.env.example` or `import.env` as a template. For local development create `backend/.env` (and set the same values in Vercel for production):

```env
NODE_ENV=development
PORT=5001

JWT_SECRET=your_super_secret_key
FRONTEND_URL=http://localhost:5173
```

Notes:
- **No database env vars required** (`DB_*` not used in static demo mode).
- On Vercel, set at least `JWT_SECRET` and `FRONTEND_URL` (and `NODE_ENV=production`, `VERCEL=1`). See `VERCEL_DEPLOYMENT.md`.

### Local Setup
1. Clone the repository and navigate to the root directory.
2. Install dependencies: `npm run install-all`
3. Launch the development environment: `npm run dev` (or run backend/frontend per project scripts)

### Production (Vercel)
1. Import/connect this repo in Vercel (configured as a multi-service project in `vercel.json`: `backend` Express + `frontend` Vite, with `/api/*` routed to backend).
2. Set env vars: `NODE_ENV`, `JWT_SECRET`, `FRONTEND_URL` (e.g. `https://<your-project>.vercel.app`), and optionally `VERCEL=1`.
3. Deploy and verify login and core pages load with demo data. No database provisioning or seeding is required.

---

## 📄 License & Attribution

Internal Property of the Institutional Bodies. Developed and Architected by:

**Mr. Lloyd Christopher F. Dacles, MIS, CITSMP, DBMP, CPAA, ITPO, CDSA**  
*Master of Information Systems | Information Technology Professional*

---
*Note: This README serves as the official structural record for SchedulaPro 2026. All rights to the algorithmic logic and core architecture are reserved by the Founding Architect.*
