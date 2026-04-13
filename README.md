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
- **Real-Time Sync:** `Socket.io` (Instant institutional updates)
- **Database:** `MySQL` (Atomicity and relational integrity)
- **Validation:** `Zod` (Schema-level data hardening)
- **Performance:** `Compression` + `HTTP/2` Readiness

---

## ⚙️ Installation & Deployment

### Environment Configuration
The system requires a `.env` file in the `backend/` directory with the following parameters:
```env
PORT=5001
DB_HOST=your_host
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=scheduling_system
JWT_SECRET=your_super_secret_key
FRONTEND_URL=http://localhost:5173
```

### Local Setup
1. Clone the repository and navigate to the root directory.
2. Install all dependencies: `npm run install-all`
3. Initialize the database: `npm run seed`
4. Launch Development Environment: `npm run dev`

### Production Context
The system is optimized for **Vercel** deployment (Hobby/Pro), utilizing a monolithic backend entry point strategy to stay within serverless function limits while maintaining full API responsiveness.

---

## 📄 License & Attribution

Internal Property of the Institutional Bodies. Developed and Architected by:

**Mr. Lloyd Christopher F. Dacles, MIS, CITSMP, DBMP, CPAA, ITPO, CDSA**  
*Master of Information Systems | Information Technology Professional*

---
*Note: This README serves as the official structural record for SchedulaPro 2026. All rights to the algorithmic logic and core architecture are reserved by the Founding Architect.*
