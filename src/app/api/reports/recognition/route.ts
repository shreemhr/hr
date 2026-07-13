import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

// Rating text -> points (0..40)
const RATING_POINTS: Record<string, number> = {
  outstanding: 40,
  exceeds_expectations: 32,
  meets_expectations: 22,
  needs_improvement: 10,
  unsatisfactory: 0,
};

// GET /api/reports/recognition?property_id=xxx&month=YYYY-MM
// Returns a ranked star list. Auto-score (data we already have) + manual kudos.
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get('property_id');
  const monthParam = searchParams.get('month'); // YYYY-MM, defaults to current month

  const scoped = !isAdmin(session.role) ? (session.propertyIds ?? []) : null;
  if (scoped && scoped.length === 0) return NextResponse.json({ month: monthParam, rows: [] });

  // Month window
  const now = new Date();
  const [yy, mm] = monthParam
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const monthStart = new Date(yy, mm - 1, 1);
  const monthEnd = new Date(yy, mm, 1);

  // Active employees in scope
  let empQ = supabase
    .from('employees')
    .select('id, first_name, last_name, hire_date, property_id, position_id, properties(name), positions(title, pay_band_max, pay_type)')
    .eq('company_id', session.companyId)
    .eq('status', 'active');

  if (propertyId) empQ = empQ.eq('property_id', propertyId);
  else if (scoped) empQ = empQ.in('property_id', scoped);

  const { data: empsRaw, error: empErr } = await empQ;
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });
  const emps = (empsRaw ?? []) as any[];
  if (emps.length === 0) return NextResponse.json({ month: `${yy}-${String(mm).padStart(2, '0')}`, rows: [] });

  const empIds = emps.map((e) => e.id);

  // Latest completed review per employee
  const { data: reviews } = await supabase
    .from('performance_reviews')
    .select('employee_id, rating, review_date, status')
    .eq('company_id', session.companyId)
    .in('employee_id', empIds)
    .in('status', ['completed', 'acknowledged'])
    .order('review_date', { ascending: false });

  const latestReview = new Map<string, string>();
  for (const r of reviews ?? []) {
    if (!latestReview.has(r.employee_id) && r.rating) latestReview.set(r.employee_id, r.rating);
  }

  // Disciplinary records in the last 12 months (recent ones reduce score)
  const yearAgo = new Date(now.getTime() - 365 * 86400000);
  const { data: disc } = await supabase
    .from('disciplinary_records')
    .select('employee_id, issued_date, type')
    .eq('company_id', session.companyId)
    .in('employee_id', empIds)
    .gte('issued_date', yearAgo.toISOString().slice(0, 10));

  const discCount = new Map<string, number>();
  for (const d of disc ?? []) {
    discCount.set(d.employee_id, (discCount.get(d.employee_id) ?? 0) + 1);
  }

  // Recognitions: total (all time) + this month
  const { data: recs } = await supabase
    .from('recognitions')
    .select('employee_id, created_at, category, note, given_by_name')
    .eq('company_id', session.companyId)
    .in('employee_id', empIds);

  const kudosTotal = new Map<string, number>();
  const kudosMonth = new Map<string, number>();
  for (const r of recs ?? []) {
    kudosTotal.set(r.employee_id, (kudosTotal.get(r.employee_id) ?? 0) + 1);
    const c = new Date(r.created_at);
    if (c >= monthStart && c < monthEnd) {
      kudosMonth.set(r.employee_id, (kudosMonth.get(r.employee_id) ?? 0) + 1);
    }
  }

  const tenureDays = (hire?: string | null) =>
    hire ? Math.max(0, (now.getTime() - new Date(hire).getTime()) / 86400000) : 0;

  const rows = emps.map((e) => {
    const ratingKey = latestReview.get(e.id);
    const reviewPts = ratingKey ? (RATING_POINTS[ratingKey] ?? 0) : 14; // neutral if never reviewed

    // Tenure: up to 20 pts, maxing around 3 years
    const td = tenureDays(e.hire_date);
    const tenurePts = Math.min(20, Math.round((td / (365 * 3)) * 20));

    // Clean record: 20 pts, minus 8 per disciplinary in last year
    const dCount = discCount.get(e.id) ?? 0;
    const cleanPts = Math.max(0, 20 - dCount * 8);

    // Kudos: up to 20 pts (5 per kudos, all-time)
    const kTotal = kudosTotal.get(e.id) ?? 0;
    const kudosPts = Math.min(20, kTotal * 5);

    const score = Math.round(reviewPts + tenurePts + cleanPts + kudosPts);

    // Near band ceiling flag (within 5% of max), for the promotion tie-in
    const bandMax = e.positions?.pay_band_max != null ? Number(e.positions.pay_band_max) : null;

    const signals: string[] = [];
    if (ratingKey) signals.push(`★ ${RATING_LABEL[ratingKey] ?? ratingKey}`);
    if (dCount === 0) signals.push('Clean record');
    if (td >= 365 * 2) signals.push(`${Math.floor(td / 365)}yr tenure`);
    if ((kudosMonth.get(e.id) ?? 0) > 0) signals.push(`${kudosMonth.get(e.id)} kudos this month`);

    return {
      employee_id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      property: e.properties?.name ?? '—',
      position: e.positions?.title ?? '—',
      score: Math.min(100, score),
      ratingKey: ratingKey ?? null,
      disciplinaryCount: dCount,
      tenureDays: Math.round(td),
      kudosTotal: kTotal,
      kudosThisMonth: kudosMonth.get(e.id) ?? 0,
      bandMax,
      signals,
    };
  });

  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return NextResponse.json({ month: `${yy}-${String(mm).padStart(2, '0')}`, rows });
}

const RATING_LABEL: Record<string, string> = {
  outstanding: '5.0 review',
  exceeds_expectations: '4.5 review',
  meets_expectations: '3.5 review',
  needs_improvement: '2.0 review',
  unsatisfactory: '1.0 review',
};
