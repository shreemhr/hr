# StayHR — Deployment Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18.17+ |
| npm | 9+ |
| Supabase account | Free tier works for dev |

---

## 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your **Project URL** and **service_role key** (Settings → API)
3. Schema changes are managed as versioned migrations in `supabase/migrations/` and apply
   **automatically on every deploy** (see §4) — you don't need to run any SQL by hand for a
   new project. `docs/SCHEMA.sql` is kept only as a human-readable reference of the full
   schema; it is not run directly anymore.

---

## 2. Environment Variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Session (must be 32+ characters, keep secret)
SESSION_SECRET=change-me-to-a-long-random-string-32chars

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Never commit `.env.local`.** It's already in `.gitignore`.

---

## 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the marketing page.  
Click **Start Free Trial** to create your first account.

---

## 4. Production Build & Automatic Migrations

`npm run build` runs `scripts/migrate.mjs` before `next build`, which applies any pending
files in `supabase/migrations/` directly to your database via the Supabase CLI
(`supabase db push`). This means schema changes ship automatically with each deploy —
no manual SQL Editor step required.

This requires one additional environment variable:

```env
SUPABASE_DB_URL=postgresql://postgres:<db-password>@db.<project-ref>.supabase.co:5432/postgres
```

Find it in the Supabase dashboard → **Project Settings → Database → Connection string**
(select **URI**, direct connection — not the pooled/transaction one). This is a highly
sensitive credential (full database access) — add it only as an encrypted environment
variable in your hosting provider's dashboard (e.g. Vercel → Settings → Environment
Variables), never commit it, and avoid pasting it into chat/logs.

If `SUPABASE_DB_URL` isn't set (e.g. local builds), the migration step is skipped with a
warning rather than failing the build — set it in every environment where you want
migrations to actually run (typically Production and Preview on Vercel).

Deploy to **Vercel** (recommended):

```bash
npm i -g vercel
vercel --prod
```

Add all environment variables (including `SUPABASE_DB_URL`) in the Vercel dashboard under
**Settings → Environment Variables** before deploying.

To run migrations manually at any time (e.g. from your own machine):

```bash
SUPABASE_DB_URL=... npm run db:migrate
```

---

## 5. First-Run Checklist

After signing up as the first user:

1. **Admin → Properties** — Add at least one hotel property (must have a state set)
2. **Admin → Positions** — Add job titles (e.g., Front Desk, Housekeeping Lead)
3. **Admin → Users** — Invite GMs/HR staff
4. **Employees → New Employee** — Add your first employee
5. On the employee profile, click **Start Onboarding** — tasks auto-generate based on the property's state
6. **Documents → Offer Letter** — Generate, preview, and print/save to PDF

---

## 6. Changing the Product Name

The product name lives in exactly one file:

```ts
// src/lib/product.ts
export const PRODUCT_NAME = 'StayHR';
```

Change it there and it propagates everywhere automatically.

---

## 7. Password Security Note

The current implementation uses SHA-256 + UUID salt for password hashing (compatible with Next.js Edge runtime). For production, upgrade to **bcryptjs** by:

1. `npm install bcryptjs @types/bcryptjs`
2. Change the `api/auth/signup` and `api/auth/login` routes to use `bcrypt.hash` / `bcrypt.compare`
3. Remove `runtime = 'edge'` declarations if any, since bcrypt requires Node.js runtime

---

## 8. Phases Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Multi-tenant foundation, auth, trial |
| 2 | ✅ Complete | Core HR: properties, positions, users, employees |
| 3 | ✅ Complete | Onboarding queue, state forms, offer letters, ZIP export |
| 4 | Planned | Checklists & self-service employee portal |
| 5 | Planned | Lifecycle, disciplinary, offboarding, email notifications |
| 6 | Planned | Stripe billing, plan gating |
| 7+ | Planned | AI document generation (Claude API) |

---

## 9. Stripe Setup (Phase 6)

1. Create a Stripe account at [stripe.com](https://stripe.com)

2. Create 3 Products in Stripe Dashboard (Catalog → Products):

   | Product  | Price        | Billing |
   |----------|--------------|---------|
   | Starter  | $5 per unit  | Monthly |
   | Growth   | $4 per unit  | Monthly |
   | Enterprise | $3 per unit | Monthly |

   Set pricing model to **Per unit** (not flat rate). Copy each **Price ID** (starts with `price_`).

3. Add to `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_live_...        # Dashboard → Developers → API keys
   STRIPE_WEBHOOK_SECRET=whsec_...      # See step 4
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_GROWTH=price_...
   STRIPE_PRICE_ENTERPRISE=price_...
   ```

4. Set up webhook (Dashboard → Developers → Webhooks → Add endpoint):
   - URL: `https://yourdomain.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

5. Enable Customer Portal (Dashboard → Settings → Billing → Customer portal) — allow customers to cancel, update payment, and change plan.

6. Run the Phase 6 schema migrations (add columns to `companies` table — see bottom of `docs/SCHEMA.sql`).

> **Test mode first**: Use `sk_test_` keys and [Stripe test cards](https://stripe.com/docs/testing) before going live.
