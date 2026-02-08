# Stingrays HRMS – Microservices Implementation Plan

This plan covers implementing the remaining HRMS features as **microservices** (one by one) and the **Prospects** feature in Employee Onboarding. **Do not assume anything—ask the user before proceeding** at each phase or when anything is unclear.

---

## Current State (No Changes in This Plan)

- **hrms-ui** (port 3000): Next.js app with Dashboard, **Users** (sidebar), and placeholder pages for Payroll, Leave, Attendance, Performance, Reports.
- **auth-service** (port 4001 → 4000 inside container): Login + Users CRUD; uses `Users`, `Roles`, `UserRoles` in StingraysHRMS DB.
- **employee-onboarding**:
  - **employee-ui** (port 3001): Next.js with Onboarding, **Prospects** (placeholder), Reports, Templates, Checklists.
  - **employee-api** (port 4000): Employees CRUD + onboarding flows; uses `Employees` and related tables in StingraysHRMS DB.
- **shared/components/AppNavbar.tsx**: Top navbar used by hrms-ui (variant `hrms`) and employee-ui (variant `employee`). Currently has: Dashboard, Employee Onboarding, Payroll (link to `#` or HRMS).

---

## Shared UI and Shared Session (Mandatory for All Microservices)

**Single source UI from repo-root `shared/`:** All microservices **must** use **one shared UI** from the **repo-root** **`shared/`** folder: topbar (microservice switcher) and sidebar (microservice-specific nav) from the same root folder. Do **not** create or copy a `shared/` folder inside any microservice (e.g. no `payroll/frontend/shared/`, no `hrms-ui/shared/`, no `employee-onboarding/frontend/shared/`). Use the same shared components from the root folder everywhere.
- **Topbar (microservice switcher):** Use **`shared/components/AppNavbar.tsx`** in every frontend. The topbar shows **only** links to **switch between microservices** (Dashboard, Employee Onboarding, Payroll, Leave, etc.). Add a `variant` per app so the active microservice is highlighted.
- **Sidebar (microservice-specific nav):** Use **`shared/components/AppSidebar.tsx`** in every frontend. It is a **single shared component** that accepts an `items` prop (array of `{ href, label, icon }`). Each app passes its **own** nav links (e.g. HRMS: Users, Payroll…; Payroll: Pay runs, Config, Reports…; Employee: Prospects, Onboarding…). Same look everywhere; only the links differ.
- **Other shared components:** Use any other shared components (e.g. `AppFooter`, future layout or auth components) from the repo-root **`shared/`** so behaviour and look stay consistent.
- **Setup:** Add the new frontend to **`scripts/prepare-shared.js`** so the root `shared/` is copied into that app. In the Dockerfile (build **context: repo root**), **`COPY shared ./shared/`**. Use **`@shared/*`** in tsconfig (e.g. `"./shared/*"` where shared is the copied root folder).

**Shared session (single sign-on):** Session **must** be shared across all microservices. A user who logs in once (e.g. in hrms-ui or a central login) must remain logged in when switching to any other microservice (Employee Onboarding, Payroll, Leave, etc.).
- **Auth source of truth:** auth-service issues the JWT; all microservice UIs and APIs use the same token for identity.
- **Implementation:** All frontends must use the same auth mechanism: read and send the same token (e.g. `auth_token` in cookie or localStorage, or `Authorization` header). When apps run on different origins (e.g. different ports), use one of: **(a)** shared cookie domain in production so one cookie works across subdomains; **(b)** central login that redirects to each app with token (e.g. in URL hash or query) so each app can persist it; **(c)** reverse proxy so all UIs are served under one origin and one cookie works. Each new microservice must integrate with this shared session (e.g. use a shared AuthContext pattern, same token key, and pass token to its API).
- **Navbar user/logout:** The shared `AppNavbar` accepts optional `user` and `onLogout`; each microservice should pass the current user and logout handler from its auth context so the topbar shows the same user and logout everywhere.

---

## UI / Navigation Rules (Apply to All Phases)

- **Topbar – microservice switcher only:** The **top bar** must show **only** links to **switch between microservices** (Dashboard / HRMS, Employee Onboarding, Payroll, Leave, etc.). Use **`shared/components/AppNavbar.tsx`** in every frontend; add a `variant` per app so the active microservice is highlighted.
- **Sidebar – shared component, microservice-specific links:** Use **`shared/components/AppSidebar.tsx`** with an `items` prop. Each app defines its **own** sidebar items (e.g. in `app/config/sidebarItems.ts`) and passes them to the shared `AppSidebar`. Same single component everywhere; only the nav links differ per microservice.
- **Implementation approach:** Each microservice has its **own backend API** and **own frontend app** (or static UI) on a **dedicated port**. The navbar will link to each app by URL (e.g. `http://localhost:3XXX`).  
  - **Ask user:** Prefer **external links** (open in same tab or new tab) or **embedded iframe** inside hrms-ui for each microservice? Default assumption: **external links** (same tab) unless you specify.
- **Where to change navbar:** `shared/components/AppNavbar.tsx` – add one nav item per microservice, with `href` pointing to the microservice base URL (from env or constant).  
  - **hrms-ui** must pass or use env vars for each microservice URL (e.g. `NEXT_PUBLIC_PAYROLL_URL`, `NEXT_PUBLIC_LEAVE_URL`, …) so the shared navbar can link correctly.  
  - **docker-compose:** Add one service per microservice (frontend + backend if applicable) and expose the chosen port; add corresponding env vars to hrms-ui.
- **Sidebar:** Each app uses **shared** `AppSidebar` with its own `items` (e.g. hrms-ui: Dashboard, Users, Payroll, Leave…; payroll: Pay runs, Config, Reports). Sidebar items can be internal routes or links to other microservice URLs (e.g. “Payroll” in sidebar: go to Payroll app vs stay on hrms-ui).

---

## Microservice Folder Structure and Docker (Mandatory for All Phases)

**Folder structure:** Each microservice **must** follow the **employee-onboarding** pattern:

- **Main folder:** One folder at repo root named after the microservice (e.g. `payroll`, `leave`, `attendance`, `performance`, `reports`).
- **Under it:** Exactly two subfolders:
  - **`backend/`** – API (Express, config, routes, controllers, etc.). Same structure as `employee-onboarding/backend/` (e.g. `config/`, `routes/`, `index.js` or `src/index.ts`, `Dockerfile`, `package.json`).
  - **`frontend/`** – Next.js app (e.g. `app/`, `components/`, `layout.tsx`, `Dockerfile`, `package.json`). **Must use shared UI and shared session:** use **`shared/components/AppNavbar`** (topbar) and **`shared/components/AppSidebar`** (sidebar with microservice-specific `items`); add app to `prepare-shared.js`; Dockerfile **COPY shared ./shared/**; integrate with the same auth token/session as other microservices.

**Do not** create separate top-level folders like `(name)-service` and `(name)-ui`. Use **`(microservice-name)/backend`** and **`(microservice-name)/frontend`** only.

**Single docker-compose:** The **main** `docker-compose.yml` at repo root must be the only file needed to run the full application. One command (`docker-compose up --build` or `docker-compose up`) must start all services (hrms-ui, auth-service, mssql, mssql-init, employee-ui, employee-api, payroll-ui, payroll-api, and any future microservices) without requiring multiple `docker-compose` invocations or other manual commands. All microservice **frontends** must use build **context: .** (repo root) and **dockerfile: (microservice-name)/frontend/Dockerfile**. All microservice **backends** must use **build: ./(microservice-name)/backend**. Frontend Dockerfiles that need repo-root context must use `COPY (microservice-name)/frontend/ ...` paths. **Dependency install:** Use `RUN npm install --legacy-peer-deps` (not `npm ci`) in all Dockerfiles so that dependencies are installed during `docker-compose build` without requiring `package-lock.json` or a prior `npm install` on the host.

---

## Port Allocation (Proposed – Confirm With User)

| Service / App              | Proposed Port (host) | Notes                    |
|----------------------------|----------------------|--------------------------|
| Payroll UI                 | 3010                 | Payroll microservice     |
| Payroll API                | 4010                 |                          |
| Leave Management UI        | 3011                 | Leave microservice       |
| Leave Management API       | 4011                 |                          |
| Attendance UI              | 3012                 | Attendance microservice  |
| Attendance API             | 4012                 |                          |
| Performance UI             | 3013                 | Performance microservice |
| Performance API            | 4013                 |                          |
| Reports UI                 | 3014                 | Reports microservice     |
| Reports API                | 4014                 |                          |

**Ask user:** Confirm these ports or provide a different mapping before implementing each phase.

---

## Tech Stack (Proposed – Confirm With User)

- **Backend:** Node.js + Express (same as auth-service and employee-api). TypeScript optional but recommended for new services.
- **Database:** Same MSSQL instance (StingraysHRMS); each microservice gets its own set of tables (e.g. `Payroll.*`, `Leave.*`, `Attendance.*`, `Performance.*`, `Reports` or aggregated read-only views).
- **Frontend:** Next.js (same as hrms-ui and employee-ui) for each microservice UI, so structure and patterns stay consistent.
- **Auth:** auth-service is the source of truth for login and JWT. Each microservice API validates the same JWT (header or cookie). **Session is shared** across all microservice UIs (see **Shared UI and Shared Session** above)—one login must work everywhere.

---

## Phase 0: Prospects Feature (Employee Onboarding)

**Scope:** Employee Onboarding microservice only (employee-ui + employee-api). No navbar changes in hrms-ui.

### 0.1 Requirements Summary

- **CSV upload:** User uploads a CSV file; backend parses it and stores rows in the database.
- **Prospects tab:** Display stored prospect data (list/table) with filters/columns as needed.
- **CRUD:** Create, Read, Update, Delete prospect records (from UI, not only from CSV).
- **Eligibility:** Each prospect has a **default status** when uploaded. Eligibility is checked based on criteria derived from CSV data. Criteria and status values to be defined with user input.

### 0.2 What to Ask the User Before Coding

1. **CSV structure (mandatory):**
   - **Exact column names (headers)** in the CSV.
   - **Data type for each column** (e.g. text, number, integer, date, boolean). Use these to design DB columns and validation.
   - **Which columns are required** vs optional.
2. **Eligibility:**
   - **What does “eligibility” mean in your process?** (e.g. eligible for interview, eligible for role X.)
   - **Default status value(s)** for newly uploaded prospects (e.g. `Pending`, `Under Review`).
   - **Criteria for eligibility:** Which CSV columns (and rules, e.g. “age between 18 and 60”, “experience >= 2 years”) determine eligibility? Ask for each rule in concrete terms.
3. **Prospects tab:** Any specific columns to show by default, filters (e.g. by status, date range), or sorting preferences?

### 0.3 Implementation Steps (After User Answers)

1. **Database:** Add table(s) for Prospects (e.g. `Prospects`) in StingraysHRMS. Columns must match the CSV schema + at least: `Id`, `Status`, `EligibilityStatus` or similar, `CreatedAt`, `UpdatedAt`. Use a separate migration script (e.g. in `init-sql/` or `employee-onboarding/backend/migrations`) so the agent can run it without assuming schema.
2. **employee-api:**  
   - POST endpoint: accept multipart CSV file, parse (e.g. with `csv-parse` or similar), validate rows against the agreed schema, insert into DB, set default status (and compute eligibility if rules are defined).  
   - GET list (with optional filters), GET by id, PUT, DELETE.  
   - **Ask user:** Soft delete (e.g. `IsActive = 0`) or hard delete?
3. **employee-ui – Prospects page:**  
   - File input for CSV upload; call POST endpoint; show success/error and optionally refresh list.  
   - Table/list of prospects with columns from schema + status; filters if requested.  
   - Add / Edit / Delete actions (forms or modals) calling the API.  
   - If eligibility is computed, show it and optionally allow filtering by it.
4. **Eligibility logic:** Implement in backend based on the criteria provided by the user (e.g. a function that sets `EligibilityStatus` from CSV columns).

**Deliverable:** Prospects feature fully working in Employee Onboarding (CSV upload, list, CRUD, status/eligibility). No changes to hrms-ui navbar in this phase.

---

## Phase 1: Payroll Microservice

### 1.1 What to Ask the User Before Coding

- **Payroll scope:** What is included? (e.g. salary, allowances, deductions, tax, bonuses, pay period—monthly/bi-weekly.)
- **Data model:** Which entities? (e.g. Employee link to `Employees` table? Pay runs? Payslips? Tax brackets?)
- **Business rules:** How is gross/net calculated? Any fixed deduction rules or configurable?
- **Permissions:** Who can view/edit payroll? (e.g. admin, hr only—to be enforced when RBAC is added.)
- **Reports:** Any specific payroll reports needed in this phase (e.g. monthly summary, tax summary)?

### 1.2 Implementation Steps (High Level)

1. **Ports:** Payroll UI 3010, Payroll API 4010 (confirm with user).
2. **Database:** New tables under StingraysHRMS (e.g. `PayrollRuns`, `Payslips`, `PayrollConfig`—exact names after user answers).
3. **Payroll API:** In `payroll/backend/` (Express app; CRUD or domain endpoints for pay runs, payslips, and any config; use same DB connection pattern as auth-service/employee-api).
4. **Payroll UI:** In `payroll/frontend/` (Next.js app; list pay runs, create/edit run, view payslips; optional report view).
5. **Navbar:** In `shared/components/AppNavbar.tsx`, add “Payroll” link pointing to `NEXT_PUBLIC_PAYROLL_URL` (e.g. `http://localhost:3010`). Add env in hrms-ui and docker-compose for `NEXT_PUBLIC_PAYROLL_URL`.
6. **Docker:** Add `payroll-ui` (build from `payroll/frontend`) and `payroll-api` (build from `payroll/backend`) to the main docker-compose with correct ports and DB env.

**Deliverable:** Payroll microservice runnable on its ports; Payroll link on top navbar opens Payroll app. Details (screens, fields, calculations) depend on user answers.

---

## Phase 2: Leave Management System Microservice

### 2.1 What to Ask the User Before Coding

- **Leave types:** Which types? (e.g. annual, sick, unpaid, maternity.)
- **Policies:** Annual entitlement per type? Carry-over? Approval workflow (e.g. manager approval, HR approval)?
- **Data model:** Leave balance per employee per type? Leave requests (from, to, type, status)? History?
- **Calendar:** Any integration with public holidays or company calendar?
- **Notifications:** Any need for email/in-app notifications on request or approval?

### 2.2 Implementation Steps (High Level)

1. **Ports:** Leave UI 3011, Leave API 4011 (confirm with user).
2. **Database:** Tables for leave types, entitlements, balances, requests, approvals (exact schema after user answers).
3. **Leave API:** Express app; endpoints for leave types, balances, submit request, approve/reject, list requests.
4. **Leave UI:** Next.js app; apply for leave, view balance, list requests; admin/hr: approve, view all.
5. **Navbar:** Add “Leave Management” link to `NEXT_PUBLIC_LEAVE_URL` (e.g. `http://localhost:3011`).
6. **Docker:** Add leave-ui and leave-api services.

**Deliverable:** Leave microservice on its ports; link on top navbar.

---

## Phase 3: Attendance Microservice

### 3.1 What to Ask the User Before Coding

- **Capture method:** Check-in/check-out (manual buttons), biometric, badge, or integration with external system?
- **Data stored:** Daily attendance records (in, out, total hours)? Overtime? Remote vs office?
- **Policies:** Late threshold, half-day rules, overtime calculation?
- **Reporting:** Daily/monthly attendance summary, absent list, late report?

### 3.2 Implementation Steps (High Level)

1. **Ports:** Attendance UI 3012, Attendance API 4012.
2. **Database:** Tables for attendance records (and possibly shifts/rosters if needed).
3. **Attendance API:** Record check-in/out, get attendance for date range, optional reports.
4. **Attendance UI:** Next.js app; check-in/out (if manual), view own attendance, admin view and reports.
5. **Navbar:** Add “Attendance” link to `NEXT_PUBLIC_ATTENDANCE_URL`.
6. **Docker:** Add attendance-ui and attendance-api.

**Deliverable:** Attendance microservice on its ports; link on top navbar.

---

## Phase 4: Performance (Staff Evaluation) Microservice

### 4.1 What to Ask the User Before Coding

- **Evaluation model:** KPI-based, rating scale (1–5), goals, competencies, or mix?
- **Cycle:** Annual, quarterly, or configurable?
- **Process:** Self-assessment, manager review, HR review? Who can submit and who can approve?
- **Data model:** Evaluation periods, goals, ratings, comments, status (draft/submitted/completed)?
- **Reports:** Aggregated ratings, comparison across departments, trends?

### 4.2 Implementation Steps (High Level)

1. **Ports:** Performance UI 3013, Performance API 4013.
2. **Database:** Tables for evaluation cycles, criteria, employee evaluations, ratings, goals.
3. **Performance API:** CRUD for cycles, criteria, evaluations; submit, approve; list by employee/period.
4. **Performance UI:** Next.js app; employee: self-assessment, view feedback; manager: rate, approve; admin: configure cycles, view reports.
5. **Navbar:** Add “Performance” link to `NEXT_PUBLIC_PERFORMANCE_URL`.
6. **Docker:** Add performance-ui and performance-api.

**Deliverable:** Performance microservice on its ports; link on top navbar.

---

## Phase 5: Reports Microservice

### 5.1 What to Ask the User Before Coding

- **Report types:** Which reports? (e.g. headcount, turnover, attendance summary, leave summary, payroll summary, performance summary.)
- **Data source:** Only from this HRMS (Payroll, Leave, Attendance, Performance, Users, Employees) or also external?
- **Format:** On-screen only, or PDF/Excel export?
- **Filters:** By department, date range, employee, etc.?
- **Permissions:** Who can see which reports?

### 5.2 Implementation Steps (High Level)

1. **Ports:** Reports UI 3014, Reports API 4014.
2. **Database:** May mostly read from existing tables; optional cache or materialized views if performance is an issue. **Ask user** if any report-specific tables are needed.
3. **Reports API:** Endpoints per report type (e.g. GET /reports/headcount, GET /reports/leave-summary) with query params for filters; optionally generate PDF/Excel.
4. **Reports UI:** Next.js app; list report types; run report with filters; display table/charts; download if required.
5. **Navbar:** Add “Reports” link to `NEXT_PUBLIC_REPORTS_URL`.
6. **Docker:** Add reports-ui and reports-api.

**Deliverable:** Reports microservice on its ports; link on top navbar.

---

## Execution Process

- Implement **one phase at a time** (Phase 0, then 1, then 2, …).
- **Before starting each phase:** Ask the user to confirm ports and answer the “What to ask” questions for that phase.
- **After each phase:** Ask the user to confirm or adjust before starting the next.
- If anything is ambiguous (APIs, auth, deployment, schema), **ask before assuming**.

---

## File / Repo Structure After All Phases (Reference)

```
Stingrays_HRMS/
├── auth-service/           # existing
├── hrms-ui/                # existing; navbar updated to link to each microservice
├── employee-onboarding/     # existing + Prospects (Phase 0)
│   ├── frontend/
│   └── backend/
├── payroll/                # Phase 1 (microservice folder structure)
│   ├── frontend/
│   └── backend/
├── leave/                  # Phase 2 (same structure: frontend/ + backend/)
├── attendance/              # Phase 3
├── performance/            # Phase 4
├── reports/                # Phase 5
├── shared/                 # existing; AppNavbar updated
├── init-sql/               # existing + new migrations per service
└── docker-compose.yml      # single file; one command runs full app
```

---

## Summary Checklist for Agent

- [ ] **Shared UI:** Every microservice uses **one shared UI** from repo-root **`shared/`**: **AppNavbar** (topbar = microservice switcher) and **AppSidebar** (sidebar with app-specific `items`); add to `prepare-shared.js`; Dockerfile COPY shared; use `@shared/*` in tsconfig.
- [ ] **Shared session:** All microservices use the same auth token and session; one login works across hrms-ui, employee-ui, payroll-ui, and future UIs (see **Shared UI and Shared Session**).
- [ ] **Phase 0 – Prospects:** Get CSV columns + types + eligibility rules from user → DB + API + UI in Employee Onboarding.
- [ ] **Phase 1 – Payroll:** Get scope, rules, ports from user → new service + navbar link.
- [ ] **Phase 2 – Leave:** Get leave types, policies, ports from user → new service + navbar link.
- [ ] **Phase 3 – Attendance:** Get capture method, rules, ports from user → new service + navbar link.
- [ ] **Phase 4 – Performance:** Get evaluation model, cycle, process from user → new service + navbar link.
- [ ] **Phase 5 – Reports:** Get report types, format, filters from user → new service + navbar link.
- [ ] **Navbar:** All microservices visible in **top navbar** (shared AppNavbar), each linking to its own port; sidebar unchanged for internal HRMS pages.
- [ ] **No assumptions:** At each phase, ask the user for the listed inputs before coding.
