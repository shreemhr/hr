# ShreemHR — Phase 7 Deployment & Verification Checklist

This release folds in everything: the **ShreemHR rebrand**, **hiring needs tracker**,
**turnover analytics**, the **UI redesign** (warm palette, Fraunces + Inter, check-in
naming), and **Phase 7 — Compensation Controls & Recognition**.

Build status: `npm run build` passes clean with zero TypeScript errors.

> **Note:** section 1 below is kept as a historical record of what this release needed.
> Schema changes now apply automatically on deploy via `supabase/migrations/` — see
> `docs/DEPLOYMENT.md` §4 — so this manual step is no longer required for new deploys.

---

## 1. Database migration (historical — now automatic, see note above)

The full schema is in `docs/SCHEMA.sql`. For an existing database, run only the
new migration statements:

```sql
-- Pay bands on positions
alter table positions add column if not exists pay_band_min numeric(10,2) default null;
alter table positions add column if not exists pay_band_max numeric(10,2) default null;
alter table positions add column if not exists pay_band_mode text not null default 'hard';

-- (If not already applied from a prior phase)
alter table positions add column if not exists headcount_target int default null;
```

Then create the two new tables — copy the `pay_exceptions` and `recognitions`
`create table` blocks from the bottom of `docs/SCHEMA.sql`.

Verify:
```sql
select column_name from information_schema.columns
  where table_name='positions' and column_name like 'pay_band%';   -- expect 3 rows
select to_regclass('public.pay_exceptions'), to_regclass('public.recognitions');  -- both non-null
```

## 2. Environment variables

No new variables this release. Confirm the existing set is present in Vercel
(Supabase keys, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, Stripe keys, Resend keys).
`NEXT_PUBLIC_APP_URL` should be the production URL (used in notification emails).

## 3. Fonts

The app loads Fraunces + Inter from Google Fonts in `src/app/layout.tsx`.
Confirm the production environment can reach `fonts.googleapis.com`. If your CSP
blocks it, add `fonts.googleapis.com` (styles) and `fonts.gstatic.com` (fonts).

---

## 4. CRITICAL — Pay-band verification (test against the live site)

These are the money-and-permissions paths. **Do not skip.** Test with at least one
corporate user (Owner or VP Ops) and one property user (GM or HR).

### Setup
- [ ] As corporate, go to **Admin → Compensation → Pay bands**. Set a band on a
      test role, e.g. Front Desk Agent: **min $14.00, max $17.00, mode = "Block + require approval"**. Save.
- [ ] Confirm a GM/HR user can *see* the band on that page but has **no Save control**
      that changes it (the Compensation page should redirect non-admins to /dashboard).

### Hard mode (block + exception)
- [ ] As a GM, edit a Front Desk employee's pay to **$15.00** → saves normally (in band).
- [ ] Set pay to **$17.00** → saves (at ceiling is allowed).
- [ ] Set pay to **$18.00** → **must be blocked**, modal offers "Send for approval".
      Submit with a reason.
- [ ] Set pay to **$10.00** (below floor) → blocked as well.
- [ ] Confirm the employee's pay did **NOT** change to $18 anywhere (re-open the profile).
- [ ] As corporate, go to **Compensation → Approvals** → the request is listed with the
      GM's reason. **Approve** it.
- [ ] Re-open the employee → pay is now **$18.00** (applied only after approval).
- [ ] The decision shows in **Compensation → History** with the approver's name + date.
- [ ] Repeat with a second request and **Deny** it → employee pay is unchanged, history
      shows "Denied".

### Permission lockdown (must all FAIL / be denied)
- [ ] As a GM, attempt `PATCH /api/compensation/exceptions/{id}` directly (e.g. via
      browser devtools) → must return **403** (only corporate can decide).
- [ ] As a GM, attempt to set band fields via `PATCH /api/positions/{id}` with
      `pay_band_max` → must return **403** (admin-only).
- [ ] Confirm a GM cannot approve their own exception request.

### Soft mode (allow + notify)
- [ ] As corporate, switch the test role to mode = **"Allow + notify corporate"**.
- [ ] As a GM, set pay to **$18.00** → **saves**, profile shows an amber "corporate
      has been notified" note.
- [ ] Corporate users receive a notification email (or, in dev without `RESEND_API_KEY`,
      it's printed to the server console and logged in `notification_log`).

### Edge cases
- [ ] A role with **no band set** → any pay saves freely (no block).
- [ ] Setting band **min > max** in the editor → rejected with an error message.
- [ ] The Compensation badge in the sidebar shows the pending-exception count and clears
      when the queue is empty.

## 5. Recognition verification
- [ ] On an employee profile (active), click **⭐ Recognize**, pick a type, add a note,
      submit → success state.
- [ ] Go to **Reports → Recognition** → the employee appears in the ranking with the
      kudos reflected in their score; top 3 render in the podium.
- [ ] Property filter narrows the list; GM/HR users see only their scoped properties.
- [ ] An employee near their position's band max shows the **"Near band ceiling"** flag.

## 6. Smoke test the rest (regression)
- [ ] Login, dashboard loads with new look (warm bg, serif numbers, brass brand mark).
- [ ] Sidebar shows **Check-in** (was Onboarding) and the new **Compensation** +
      **Recognition** items.
- [ ] Hiring Needs and Turnover reports still load.
- [ ] Billing page + plan gating unchanged.
- [ ] Employee portal (`/portal`) still logs in and renders.

---

## Notes for the team
- Pay-band enforcement lives in `src/lib/payband.ts` and is called from **both**
  `POST /api/employees` and `PATCH /api/employees/[id]`. If you add any other code path
  that writes `pay_rate`, route it through `checkPayAgainstBand` too.
- Approving an exception is the *only* sanctioned way pay exceeds a hard band; that path
  applies the rate directly and is gated to Owner/VP Ops in
  `PATCH /api/compensation/exceptions/[id]`.
- All notification emails are best-effort (wrapped in try/catch) so a mail failure never
  blocks a save or a decision.
