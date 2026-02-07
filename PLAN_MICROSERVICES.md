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

## UI / Navigation Rules (Apply to All Phases)

- **All five microservices** (Payroll, Leave, Attendance, Performance, Reports) must appear on the **top navbar** of the HRMS UI (localhost:3000), **not** in the sidebar.
- **Implementation approach:** Each microservice has its **own backend API** and **own frontend app** (or static UI) on a **dedicated port**. The navbar will link to each app by URL (e.g. `http://localhost:3XXX`).  
  - **Ask user:** Prefer **external links** (open in same tab or new tab) or **embedded iframe** inside hrms-ui for each microservice? Default assumption: **external links** (same tab) unless you specify.
- **Where to change navbar:** `shared/components/AppNavbar.tsx` – add one nav item per microservice, with `href` pointing to the microservice base URL (from env or constant).  
  - **hrms-ui** must pass or use env vars for each microservice URL (e.g. `NEXT_PUBLIC_PAYROLL_URL`, `NEXT_PUBLIC_LEAVE_URL`, …) so the shared navbar can link correctly.  
  - **docker-compose:** Add one service per microservice (frontend + backend if applicable) and expose the chosen port; add corresponding env vars to hrms-ui.
- **Sidebar** (hrms-ui `AppSidebar.tsx`): Stays as-is for Dashboard, Users, Payroll, Leave, Attendance, Recruitment, Performance, Reports, Settings. Sidebar can keep **internal routes** (e.g. `/payroll`) that either redirect to the microservice URL or show an embedded view—**ask user** which behaviour they want for sidebar items that match a microservice (e.g. “Payroll” in sidebar: go to Payroll app vs stay on hrms-ui).

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
- **Auth:** **Ask user:** Should each microservice validate the JWT from auth-service (same as current login), or is SSO/cookie-based auth planned? For now the plan assumes **JWT in header or cookie** validated by auth-service; microservices can call auth-service to verify token or use a shared JWT secret.

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
3. **Payroll API (new repo folder, e.g. `payroll-service/`):** Express app; CRUD or domain endpoints for pay runs, payslips, and any config; use same DB connection pattern as auth-service/employee-api.
4. **Payroll UI (new repo folder, e.g. `payroll-ui/`):** Next.js app; list pay runs, create/edit run, view payslips; optional report view.
5. **Navbar:** In `shared/components/AppNavbar.tsx`, add “Payroll” link pointing to `NEXT_PUBLIC_PAYROLL_URL` (e.g. `http://localhost:3010`). Add env in hrms-ui and docker-compose for `NEXT_PUBLIC_PAYROLL_URL`.
6. **Docker:** Add `payroll-ui` and `payroll-api` (or `payroll-service`) to docker-compose with correct ports and DB env.

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
├── payroll-service/        # Phase 1 (or payroll-api + payroll-ui)
├── leave-service/          # Phase 2
├── attendance-service/     # Phase 3
├── performance-service/    # Phase 4
├── reports-service/        # Phase 5
├── shared/                 # existing; AppNavbar updated
├── init-sql/               # existing + new migrations per service
└── docker-compose.yml      # all services + env vars
```

---

## Summary Checklist for Agent

- [ ] **Phase 0 – Prospects:** Get CSV columns + types + eligibility rules from user → DB + API + UI in Employee Onboarding.
- [ ] **Phase 1 – Payroll:** Get scope, rules, ports from user → new service + navbar link.
- [ ] **Phase 2 – Leave:** Get leave types, policies, ports from user → new service + navbar link.
- [ ] **Phase 3 – Attendance:** Get capture method, rules, ports from user → new service + navbar link.
- [ ] **Phase 4 – Performance:** Get evaluation model, cycle, process from user → new service + navbar link.
- [ ] **Phase 5 – Reports:** Get report types, format, filters from user → new service + navbar link.
- [ ] **Navbar:** All five microservices visible in **top navbar** (shared AppNavbar), each linking to its own port; sidebar unchanged for internal HRMS pages.
- [ ] **No assumptions:** At each phase, ask the user for the listed inputs before coding.
