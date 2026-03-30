# Faculty Teaching Load Scheduling System 🎓📅

## 📖 Project Overview
The **Faculty Teaching Load Scheduling System** is a comprehensive, full-stack, enterprise-grade web application designed to significantly streamline, automate, and secure the academic scheduling processes for educational institutions. It facilitates real-time data flow between Program Assistants, Program Heads, and Administrators—allowing institutional bodies to structurally manage teaching assignments, evaluate capacity overloads, generate automated schedule matrices, and perform rigorous audit tracking inherently.

---

## 🎯 Objectives
- **Centralize Operations:** Provide a single source of truth handling Faculty contracts, Subject curriculums, Section cohorts, and Room capacities.
- **Automate Core Constraints:** Intelligently track faculty teaching limits, co-teaching requirements, and physical room overlaps to reject mathematical collisions inherently.
- **Streamline Scheduling:** Offer a powerful Auto-Scheduler Algorithm paired with an intuitive Drag-and-Drop Master Schedule Calendar to deploy complex timetables perfectly.
- **Enhance Security & Auditing:** Validate user activities through strict Role-Based Access Control (RBAC) and comprehensive immutable Audit Logging.

---

## 🧱 Scope and Limitations
### Scope
- **User Roles:** The system securely partitions functionalities across three native roles: Admin, Program Head, and Program Assistant.
- **Core Entities:** Full CRUD capabilities for Users, Terms, Programs, Sections, Rooms, Subjects, and Faculty members.
- **Teaching Load Pipeline:** Assign, review, approve, reject, edit, and recursively archive teaching loads across dynamic capacity metrics.
- **Master Algorithms:** Matrix overlap detection natively inspecting parallel sections, ternary co-teachers, physical venues, and personal blackout constraints completely safely.

### Limitations
- The system focuses exclusively on the administrative deployment of Faculty schedules; it does not inherently offer student-facing portal enrollments out-of-the-box.
- Auto-Scheduling algorithms attempt mapping iteratively; extremely constrained inputs without physical facility flexibility will force secure fallbacks requiring manual resolutions natively via the UI.

---

## 💻 Technology Stack
This robust application natively binds modern scalable stacks:
- **Frontend Layer:** `React.js` (Vite) + `Tailwind CSS` for highly responsive, aesthetic, and glassmorphic UI tracking. 
- **Calendar Matrix:** `@fullcalendar/react` powering complex timeline visualizations and drag-drop edits stably.
- **State Management:** `@tanstack/react-query` actively syncing asynchronous queries smoothly across components.
- **Backend Architecture:** `Node.js` + `Express.js` handling dynamic validations, algorithm computations, and deep authorization sequences securely.
- **Database Engine:** `MySQL` (via `mysql2/promise`) rigorously storing relationships locally ensuring mathematical atomicity across queries.

---

## ⚙️ Available Features & Modules

### 1. Authentication & RBAC (Role-Based Access Control)
- **Functions:** Users login securely with JWT integration tracking roles (`admin`, `program_head`, `program_assistant`).
- **Details:** The system safely gates specific API endpoints and visual interfaces structurally. Only Admins can edit Users and execute terminal database purges. Program Heads act as final approval authorities for academic loads structurally.

### 2. Multi-Term State Management
- **Functions:** Global Academic Term selections intuitively tracking independent datasets cleanly.
- **Details:** All academic tables (loads, schedules, blackouts) perfectly isolate parameters locally into specific Semesters natively blocking data leakage structurally.

### 3. Faculty Database & Specializations
- **Functions:** Detailed instructor repositories logging max-capacity contracts and multi-subject specializations intuitively.
- **Details:** Features an "Employment Type" layer natively determining `max_teaching_hours`, while also processing visual dropdown tags `[+X Overload Units]` seamlessly handling structural overloads reaching an absolute `60 hrs` cap effectively.

### 4. Teaching Loads & Approval Pipelines
- **Functions:** Massive bulk subject assignment modules dynamically pushing classes to singular cohorts effectively.
- **Details:** Displays a visually stunning Live Load Preview (Green/Amber/Red) organically preventing impossible overloads dynamically. Supports up to 3 instructors organically (Co-Teaching ternary patterns) and includes multi-state tracking (`draft`, `pending_review`, `approved`, `rejected`, `archived`).

### 5. Master Schedule Matrix & AI Auto-Generator
- **Functions:** Visual FullCalendar deployment capturing parallel academic classes elegantly strictly blocking mathematical overlaps actively.
- **Details:**
  - **Auto-Suggest & Auto-Scheduler:** Evaluates constraints rapidly against Blackouts, Facility capacities, Section clusters, and ternary Faculty conflicts gracefully filling missing class spaces.
  - **Drag-and-Drop Editor:** Instantly move classes across the matrix natively securely computing validations mid-drag.
  - **PDF Exporting:** Capable of natively generating clean `.pdf` printable matrices visually safely.

### 6. Audit & Recovery Logs
- **Functions:** Immutable logging pipelines capturing universal system edits organically tracking IPs and Timestamps explicitly.
- **Details:** The Audit interface securely renders exact state modifications (`from` -> `to`) offering CSV Exports and structural JSON diff algorithms intuitively safely tracking all User actions mathematically.

### 7. Facilities, Sections, and Cohorts
- **Functions:** Independent matrices defining physical structure capabilities gracefully mapped to academic cohorts efficiently.
- **Details:** Automatically syncs rooms and enforces "Room Type" constraints natively checking facility configurations mathematically when attempting mappings securely.

---

*Note: This README.md acts as a living document securely logging the structural definitions of the Faculty Scheduling System architecture natively. It should be iteratively updated alongside all internal revisions mathematically deployed to the core logic.*
