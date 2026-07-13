# StayHR — Product Roadmap

## ✅ Phase 1 — Multi-Tenant Foundation
*Delivered*

- Company signup with 14-day free trial
- Iron-session authentication (owner/vp_ops/gm/hr roles)
- Multi-tenant data isolation (every query filtered by `company_id`)
- Company branding settings (logo URL, primary color)
- Trial banner with days remaining
- Marketing landing page

---

## ✅ Phase 2 — Core HR
*Delivered*

- **Properties** — CRUD for hotel locations with US state
- **Positions** — Job titles with hourly/salary pay types
- **Users** — Staff accounts scoped to company; role-based access
- **Employees** — Full employee records (name, contact, hire date, pay, status)
- **Employee profile** — Detail view with property/position context
- **Dashboard** — Stats grid: total employees, properties, open onboarding

---

## ✅ Phase 3 — Onboarding & Documents
*Delivered*

- **Onboarding queue** — All employees with pending tasks, progress bars, tab filters (pending / complete / all)
- **Per-employee onboarding checklist** — Form-by-form collect/N/A toggles with notes
- **State-aware form generation** — Federal (W-4, I-9) + state-specific forms auto-created on "Start Onboarding"
  - TX, TN, FL: no state withholding form
  - OK, IL, MO, AR, GA, NC: state W-4 variants
- **Offer letter generator** — Template fills from employee data, live iframe preview
- **Print to PDF** — Clean print page with no navigation; browser-native PDF output
- **ZIP export** — `offer_letter.html` + `onboarding_checklist.html` + `employee_info.txt` packaged via jszip
- **Document center** — Lists all offer letters with quick links to generate/view
- **Sidebar badge** — Live count of employees with pending onboarding tasks

---

## ✅ Phase 4 — Checklists & Employee Portal
*Delivered*

- **Custom checklist templates** — HR creates reusable templates (equipment, orientation, uniform, keys, training, general) with ordered items
- **Checklist assignment** — Assign any template to any employee from their profile; multiple templates supported
- **HR completion tracking** — Click-to-toggle checkboxes on employee profile; progress bar per checklist
- **Template management** — `/admin/checklists` list, create, and edit templates; archive/restore
- **Employee portal** — Separate login at `/portal` using token link + 6-digit PIN (no email required)
- **Portal onboarding view** — Employee sees their forms checklist read-only, with download links to form PDFs
- **Portal offer letter** — Employee views their offer letter in an iframe; acknowledges with typed name as electronic signature
- **Portal invite system** — HR generates invite from employee profile; PIN shown once, link copyable; regenerate anytime
- **Acknowledgement tracking** — `document_acknowledgements` table records signature, name, and timestamp

---

## ✅ Phase 5 — Lifecycle, Disciplinary & Notifications
*Delivered*

- **Disciplinary records** — Verbal warning, written warning, final warning, PIP, suspension, other; incident date, issued date, description, action taken, follow-up date; optional email notification to manager on creation
- **Employee acknowledgement** — HR marks record acknowledged, or employee acknowledges + responds in their portal
- **Performance reviews** — Review period, date, 5-point rating scale, comments, goals for next period; draft or completed status
- **Offboarding workflow** — One-click start from employee profile; 12 default tasks across equipment, access, payroll, documentation categories; progress bar; auto-marks employee as terminated
- **Manager notes / journal** — 5 types (general, meeting, performance, concern, commendation); delete own notes; private by default
- **Employee portal expanded** — Disciplinary tab (view + acknowledge records with optional response), Reviews tab (view completed reviews), Dashboard alerts for pending acknowledgements
- **Email notifications** — `src/lib/email.ts` sends via Resend API when `RESEND_API_KEY` set; falls back to console in dev; all sends logged to `notification_log` table; triggers: warning issued, offboarding started (new hire + onboarding overdue also wired)
- **Tabbed employee profile** — Profile page rebuilt as 5-tab interface: Overview, Onboarding, Disciplinary, Reviews, Notes
- **5 new DB tables** — `disciplinary_records`, `performance_reviews`, `offboarding_records`, `offboarding_tasks`, `employee_notes`, `notification_log`

---

## ⬜ Phase 6 — Billing & Plan Gating
*Planned*

- Stripe Checkout integration
- Plans: Starter (up to 50 employees), Growth (up to 200), Enterprise (unlimited)
- Per-seat billing ($3–5/employee/month)
- Usage metering in dashboard
- Grace period + dunning flow after trial

---

## ⬜ Phase 7+ — AI Features
*Planned*

- **AI unemployment claim responses** — Upload unemployment agency notice → Claude API generates a tailored response based on termination records
- **AI job description generator** — Generate position descriptions from title + department
- **Smart offer letter** — AI fills in compensation narrative from pay rate + market context
- **Anomaly detection** — Flag unusual patterns (high turnover at one property, pay equity gaps)

---

## ✅ Phase 7 — Compensation Controls & Recognition
*Shipped*

**Pay bands (corporate guardrails)**
- `pay_band_min` / `pay_band_max` / `pay_band_mode` (`hard`|`soft`) added to `positions`
- Corporate (owner/vp_ops) sets bands; GM/HR can view but not edit
- Enforcement in `src/lib/payband.ts`, called from BOTH employee POST and PATCH (cannot be bypassed)
- Hard mode: pay outside band returns HTTP 422 → GM requests an exception (reason captured)
- Soft mode: pay outside band saves but notifies corporate
- `/admin/compensation` — 3 tabs: band editor, approval queue, audit-trailed history
- Exception decision endpoint locked to owner/vp_ops; applies approved rate on approval; double-decision race guard
- `pay_exceptions` table with full attribution (requested_by, decided_by, decided_at, reason, decision_note)
- Sidebar Compensation badge shows pending-exception count

**Recognition**
- `recognitions` table (5 categories) + "⭐ Recognize" action on employee profile
- Star score auto-computed from latest completed review rating, clean disciplinary record, tenure, and kudos (`/api/reports/recognition`)
- `/reports/recognition` — monthly top-performers podium + full ranking, property-filterable, GM/HR scoped
- "Near band ceiling" flag ties recognition to the pay-band promotion conversation

**Notifications added to `src/lib/notify.ts`**: `notifyPayBandSoftFlag`, `notifyPayExceptionRequested`, `notifyPayExceptionDecided` (all resolve corporate emails, all best-effort)

**UI redesign shipped this release**: warm palette (lobby `#faf8f4`, ink `#1c1b22`, brass `#b5832e` for key/check-in moments), Fraunces + Inter fonts, serif wordmark + brass brand mark, Onboarding renamed "Check-in".

See `docs/PHASE7-CHECKLIST.md` for the deployment + verification steps (esp. the pay-band test cases).
