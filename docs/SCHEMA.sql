-- ============================================================
-- StayHR — Full Database Schema
-- Phases 1–3: Multi-tenant foundation, Core HR, Onboarding & Documents
-- ============================================================
-- Run this against your Supabase project (SQL editor or psql)
-- All tables include company_id for multi-tenant isolation
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── COMPANIES ──────────────────────────────────────────────
create table if not exists companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  logo_url        text,
  primary_color   text default '#1a56db',
  plan            text not null default 'trial',  -- trial | starter | growth | enterprise
  trial_ends_at   timestamptz,
  stripe_customer_id text,
  stripe_sub_id   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── USERS (staff/HR accounts) ──────────────────────────────
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null check (role in ('owner','vp_ops','gm','hr')),
  property_ids  uuid[] not null default '{}',  -- scoped access for gm/hr
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists users_company_id_idx on users(company_id);
create index if not exists users_email_idx on users(email);

-- ─── PROPERTIES (hotel locations) ───────────────────────────
create table if not exists properties (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  brand       text,              -- "Marriott", "Hilton", "Independent", etc.
  address     text,
  city        text,
  state       char(2) not null,  -- US state code
  zip         text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists properties_company_id_idx on properties(company_id);

-- ─── POSITIONS ───────────────────────────────────────────────
create table if not exists positions (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  title       text not null,
  department  text,
  pay_type    text not null default 'hourly' check (pay_type in ('hourly','salary')),
  pay_rate    numeric(10,2),
  headcount_target int default null,   -- desired # of active employees in this role (null = no target)
  pay_band_min numeric(10,2) default null,   -- corporate-approved minimum (null = no band set)
  pay_band_max numeric(10,2) default null,   -- corporate-approved maximum
  pay_band_mode text not null default 'hard' check (pay_band_mode in ('hard','soft')),  -- hard = block+exception, soft = flag+notify
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists positions_company_id_idx on positions(company_id);

-- Migration for existing databases:
-- alter table positions add column if not exists headcount_target int default null;
-- alter table positions add column if not exists pay_band_min numeric(10,2) default null;
-- alter table positions add column if not exists pay_band_max numeric(10,2) default null;
-- alter table positions add column if not exists pay_band_mode text not null default 'hard';

-- ─── EMPLOYEES ───────────────────────────────────────────────
create table if not exists employees (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  property_id         uuid not null references properties(id),
  position_id         uuid references positions(id),
  first_name          text not null,
  last_name           text not null,
  email               text,
  phone               text,
  hire_date           date,
  employment_type     text default 'full_time' check (employment_type in ('full_time','part_time','seasonal','contract')),
  pay_rate            numeric(10,2),
  address             text,
  city                text,
  state               char(2),
  zip                 text,
  status              text not null default 'active' check (status in ('active','terminated','on_leave')),
  onboarding_status   text not null default 'not_started' check (onboarding_status in ('not_started','in_progress','complete')),
  termination_date    date,
  termination_reason  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists employees_company_id_idx on employees(company_id);
create index if not exists employees_property_id_idx on employees(property_id);
create index if not exists employees_status_idx on employees(status);
create index if not exists employees_onboarding_status_idx on employees(onboarding_status);

-- ─── ONBOARDING TASKS (Phase 3) ─────────────────────────────
-- One row per form per employee. Auto-created from stateforms.ts
-- when "Start Onboarding" is clicked on employee profile.
create table if not exists onboarding_tasks (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,
  form_id       text not null,        -- e.g. 'w4', 'i9', 'ok_w4'
  form_name     text not null,        -- full display name
  short_name    text,                 -- abbreviated name
  description   text,
  link          text,                 -- IRS / state dept URL
  federal       boolean not null default false,
  status        text not null default 'pending' check (status in ('pending','collected','na')),
  collected_at  timestamptz,          -- when status was set to collected
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists onboarding_tasks_company_id_idx on onboarding_tasks(company_id);
create index if not exists onboarding_tasks_employee_id_idx on onboarding_tasks(employee_id);
create index if not exists onboarding_tasks_status_idx on onboarding_tasks(status);

-- Prevent duplicate tasks per employee per form
create unique index if not exists onboarding_tasks_unique_idx
  on onboarding_tasks(employee_id, form_id);

-- ─── DOCUMENTS (Phase 3) ─────────────────────────────────────
-- Stores offer letters (and future doc types). content is JSONB
-- holding the OfferLetterData fields used to regenerate HTML.
create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,
  type          text not null default 'offer_letter',  -- offer_letter | ... (future)
  title         text not null,
  content       jsonb not null default '{}',           -- OfferLetterData
  generated_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists documents_company_id_idx on documents(company_id);
create index if not exists documents_employee_id_idx on documents(employee_id);
create index if not exists documents_type_idx on documents(type);

-- ─── AUTO-UPDATE updated_at TRIGGERS ────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'companies','users','properties','positions',
      'employees','onboarding_tasks','documents'
    ])
  loop
    execute format(
      'create trigger %I before update on %I
       for each row execute function update_updated_at()',
      tbl || '_updated_at', tbl
    );
  end loop;
exception when duplicate_object then null;
end $$;

-- ─── ROW LEVEL SECURITY (recommended for production) ─────────
-- StayHR uses service-role key server-side, so RLS is optional
-- but recommended as a defense-in-depth measure.
-- Uncomment the lines below to enable per-company isolation at
-- the Postgres level (requires service role to bypass):

-- alter table companies enable row level security;
-- alter table users enable row level security;
-- alter table properties enable row level security;
-- alter table positions enable row level security;
-- alter table employees enable row level security;
-- alter table onboarding_tasks enable row level security;
-- alter table documents enable row level security;

-- ============================================================
-- Phase 4 — Checklists & Employee Portal
-- ============================================================

-- ─── CHECKLIST TEMPLATES ─────────────────────────────────────
create table if not exists checklist_templates (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  description text,
  category    text not null default 'general'
              check (category in ('general','equipment','orientation','training','uniform','keys')),
  active      boolean not null default true,
  created_by  uuid references users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists checklist_templates_company_id_idx on checklist_templates(company_id);

-- ─── CHECKLIST TEMPLATE ITEMS ────────────────────────────────
create table if not exists checklist_template_items (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references checklist_templates(id) on delete cascade,
  company_id   uuid not null,
  title        text not null,
  description  text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists checklist_template_items_template_id_idx on checklist_template_items(template_id);

-- ─── CHECKLIST ASSIGNMENTS ───────────────────────────────────
-- Which template is assigned to which employee
create table if not exists checklist_assignments (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  template_id  uuid not null references checklist_templates(id),
  employee_id  uuid not null references employees(id) on delete cascade,
  assigned_by  uuid references users(id),
  assigned_at  timestamptz not null default now()
);

create unique index if not exists checklist_assignments_unique_idx
  on checklist_assignments(template_id, employee_id);

create index if not exists checklist_assignments_employee_id_idx on checklist_assignments(employee_id);

-- ─── CHECKLIST ITEM COMPLETIONS ──────────────────────────────
-- HR-managed completion status per item per employee
create table if not exists checklist_item_completions (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null,
  assignment_id  uuid not null references checklist_assignments(id) on delete cascade,
  item_id        uuid not null references checklist_template_items(id) on delete cascade,
  employee_id    uuid not null references employees(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending','complete','na')),
  completed_by   uuid references users(id),
  completed_at   timestamptz,
  notes          text,
  updated_at     timestamptz not null default now()
);

create unique index if not exists checklist_item_completions_unique_idx
  on checklist_item_completions(assignment_id, item_id);

create index if not exists checklist_item_completions_employee_id_idx on checklist_item_completions(employee_id);

-- ─── PORTAL INVITES ──────────────────────────────────────────
-- Token + hashed PIN for employee portal access
create table if not exists portal_invites (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,
  token         text not null unique,
  pin_hash      text not null,      -- salt:sha256digest (same scheme as user passwords)
  expires_at    timestamptz,        -- null = no expiry
  created_by    uuid references users(id),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- One invite per employee (regenerating replaces the old one)
create unique index if not exists portal_invites_employee_id_idx on portal_invites(employee_id);
create index if not exists portal_invites_token_idx on portal_invites(token);

-- ─── DOCUMENT ACKNOWLEDGEMENTS ───────────────────────────────
-- Employee acknowledges their offer letter in the portal
create table if not exists document_acknowledgements (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null,
  document_id      uuid not null references documents(id) on delete cascade,
  employee_id      uuid not null references employees(id) on delete cascade,
  acknowledged_at  timestamptz not null default now(),
  signature_name   text not null      -- typed name as electronic signature
);

create unique index if not exists document_acknowledgements_unique_idx
  on document_acknowledgements(document_id, employee_id);

-- ============================================================
-- Phase 5 — Lifecycle, Disciplinary & Notifications
-- ============================================================

-- ─── DISCIPLINARY RECORDS ────────────────────────────────────
create table if not exists disciplinary_records (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null references companies(id) on delete cascade,
  employee_id              uuid not null references employees(id) on delete cascade,
  type                     text not null check (type in ('verbal_warning','written_warning','final_warning','pip','suspension','other')),
  incident_date            date,
  issued_date              date not null,
  description              text not null,
  action_taken             text,
  follow_up_date           date,
  issued_by                uuid references users(id),
  employee_acknowledged    boolean not null default false,
  employee_acknowledged_at timestamptz,
  employee_response        text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists disciplinary_records_company_emp_idx on disciplinary_records(company_id, employee_id);

-- ─── PERFORMANCE REVIEWS ─────────────────────────────────────
create table if not exists performance_reviews (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references companies(id) on delete cascade,
  employee_id        uuid not null references employees(id) on delete cascade,
  review_period      text,
  review_date        date not null,
  reviewer_id        uuid references users(id),
  rating             text check (rating in ('unsatisfactory','needs_improvement','meets_expectations','exceeds_expectations','outstanding')),
  overall_comments   text,
  goals_next_period  text,
  employee_comments  text,
  status             text not null default 'draft' check (status in ('draft','completed','acknowledged')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists performance_reviews_company_emp_idx on performance_reviews(company_id, employee_id);

-- ─── OFFBOARDING RECORDS ─────────────────────────────────────
create table if not exists offboarding_records (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  employee_id       uuid not null references employees(id) on delete cascade,
  termination_type  text check (termination_type in ('voluntary','involuntary','layoff','retirement','contract_end')),
  last_day          date,
  exit_interview_scheduled boolean not null default false,
  rehire_eligible   boolean,
  initiated_by      uuid references users(id),
  initiated_at      timestamptz not null default now(),
  notes             text,
  status            text not null default 'in_progress' check (status in ('in_progress','complete'))
);

create index if not exists offboarding_records_employee_id_idx on offboarding_records(employee_id);

-- ─── OFFBOARDING TASKS ───────────────────────────────────────
create table if not exists offboarding_tasks (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null,
  record_id    uuid not null references offboarding_records(id) on delete cascade,
  employee_id  uuid not null references employees(id) on delete cascade,
  title        text not null,
  description  text,
  category     text not null default 'general' check (category in ('equipment','access','payroll','documentation','general')),
  status       text not null default 'pending' check (status in ('pending','complete','na')),
  completed_by uuid references users(id),
  completed_at timestamptz,
  notes        text,
  sort_order   int not null default 0
);

create index if not exists offboarding_tasks_record_id_idx on offboarding_tasks(record_id);

-- ─── EMPLOYEE NOTES ──────────────────────────────────────────
create table if not exists employee_notes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  author_id   uuid references users(id),
  type        text not null default 'general' check (type in ('general','meeting','performance','concern','commendation')),
  content     text not null,
  private     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists employee_notes_employee_id_idx on employee_notes(company_id, employee_id);

-- ─── NOTIFICATION LOG ────────────────────────────────────────
create table if not exists notification_log (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  type            text not null,
  to_email        text,
  subject         text,
  sent            boolean not null default false,
  sent_at         timestamptz,
  error           text,
  reference_id    uuid,
  reference_type  text,
  created_at      timestamptz not null default now()
);

create index if not exists notification_log_company_id_idx on notification_log(company_id);

-- ============================================================
-- Phase 6 — Billing & Plan Gating (alter existing companies table)
-- ============================================================

alter table companies add column if not exists subscription_status text
  default 'trialing' check (subscription_status in ('trialing','active','past_due','canceled','unpaid','incomplete'));

alter table companies add column if not exists current_period_end timestamptz;

-- ═══════════════════════════════════════════════════════════════
-- PHASE 7 — Compensation Controls & Recognition
-- ═══════════════════════════════════════════════════════════════

-- Pay exception requests: created when a GM/HR sets pay outside the
-- approved band on a 'hard'-mode position. Routed to owner/vp_ops.
create table if not exists pay_exceptions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  employee_id     uuid references employees(id) on delete cascade,
  position_id     uuid references positions(id) on delete set null,
  requested_rate  numeric(10,2) not null,
  band_min        numeric(10,2),
  band_max        numeric(10,2),
  pay_type        text not null default 'hourly',
  reason          text,
  status          text not null default 'pending' check (status in ('pending','approved','denied')),
  requested_by    uuid references users(id) on delete set null,
  requested_by_name text,
  decided_by      uuid references users(id) on delete set null,
  decided_by_name text,
  decided_at      timestamptz,
  decision_note   text,
  created_at      timestamptz not null default now()
);
create index if not exists pay_exceptions_company_idx on pay_exceptions(company_id);
create index if not exists pay_exceptions_status_idx on pay_exceptions(company_id, status);

-- Manual recognition / kudos. Boosts an employee's star score and
-- provides an audit trail for raise & promotion decisions.
create table if not exists recognitions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,
  category      text not null default 'kudos' check (category in ('kudos','spot_award','guest_praise','milestone','teamwork')),
  note          text,
  given_by      uuid references users(id) on delete set null,
  given_by_name text,
  created_at    timestamptz not null default now()
);
create index if not exists recognitions_company_idx on recognitions(company_id);
create index if not exists recognitions_employee_idx on recognitions(employee_id);
create index if not exists recognitions_created_idx on recognitions(company_id, created_at);
