import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

// GET /api/reports/turnover?period=365&property_id=xxx
// period = number of days to look back (default 365)
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const periodDays = Math.max(1, Number(searchParams.get('period') ?? 365));
  const propertyId = searchParams.get('property_id');

  const scopedPropertyIds =
    !isAdmin(session.role) ? (session.propertyIds ?? []) : null;

  if (scopedPropertyIds && scopedPropertyIds.length === 0) {
    return NextResponse.json(emptyResult());
  }

  const now       = new Date();
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - periodDays * 86400000);

  // Pull all employees in scope with the fields needed for rate + tenure.
  let empQuery = supabase
    .from('employees')
    .select(`
      id, status, hire_date, termination_date,
      property_id, position_id,
      properties(name),
      positions(title)
    `)
    .eq('company_id', session.companyId);

  if (propertyId) {
    empQuery = empQuery.eq('property_id', propertyId);
  } else if (scopedPropertyIds) {
    empQuery = empQuery.in('property_id', scopedPropertyIds);
  }

  const { data: employeesRaw, error: empErr } = await empQuery;
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });
  const employees = (employeesRaw ?? []) as any[];

  // Termination types from offboarding_records (voluntary vs involuntary)
  const { data: offboardRaw } = await supabase
    .from('offboarding_records')
    .select('employee_id, termination_type, last_day')
    .eq('company_id', session.companyId);
  const termTypeByEmp = new Map<string, string>();
  for (const o of offboardRaw ?? []) {
    if (o.employee_id && o.termination_type) termTypeByEmp.set(o.employee_id, o.termination_type);
  }

  const inPeriod = (dateStr: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= periodStart && d <= periodEnd;
  };

  // Terminations & hires in the period
  const terminationsInPeriod = employees.filter(
    (e) => e.status === 'terminated' && inPeriod(e.termination_date)
  );
  const hiresInPeriod = employees.filter((e) => inPeriod(e.hire_date));

  // Average headcount approximation:
  //   start headcount = employees active at periodStart
  //   end headcount   = currently active
  const activeAt = (when: Date) =>
    employees.filter((e) => {
      const hired = e.hire_date ? new Date(e.hire_date) <= when : false;
      const termed =
        e.termination_date && new Date(e.termination_date) <= when;
      return hired && !termed;
    }).length;

  const startHeadcount = activeAt(periodStart);
  const endHeadcount   = employees.filter((e) => e.status === 'active').length;
  const avgHeadcount   = Math.max(1, (startHeadcount + endHeadcount) / 2);

  const fractionOfYear = periodDays / 365;
  const periodTurnover = (terminationsInPeriod.length / avgHeadcount) * 100;
  const annualizedRate = fractionOfYear > 0 ? periodTurnover / fractionOfYear : 0;

  // Average tenure at separation (days)
  const tenures = terminationsInPeriod
    .map((e) => {
      if (!e.hire_date || !e.termination_date) return null;
      const diff =
        (new Date(e.termination_date).getTime() - new Date(e.hire_date).getTime()) /
        86400000;
      return diff >= 0 ? diff : null;
    })
    .filter((x): x is number => x != null);
  const avgTenureDays =
    tenures.length > 0
      ? Math.round(tenures.reduce((a, b) => a + b, 0) / tenures.length)
      : null;

  // Voluntary vs involuntary
  let voluntary = 0;
  let involuntary = 0;
  for (const e of terminationsInPeriod) {
    const t = termTypeByEmp.get(e.id);
    if (t === 'voluntary' || t === 'retirement') voluntary++;
    else if (t === 'involuntary' || t === 'layoff' || t === 'contract_end') involuntary++;
  }

  // ── By property ──────────────────────────────────────────
  const byPropMap = new Map<string, { name: string; terms: number; start: number; end: number }>();
  const ensureProp = (id: string, name: string) => {
    if (!byPropMap.has(id)) byPropMap.set(id, { name, terms: 0, start: 0, end: 0 });
    return byPropMap.get(id)!;
  };
  for (const e of employees) {
    const name = e.properties?.name ?? '—';
    const rec = ensureProp(e.property_id, name);
    // start/end headcount per property
    const hiredByStart = e.hire_date ? new Date(e.hire_date) <= periodStart : false;
    const termedByStart = e.termination_date && new Date(e.termination_date) <= periodStart;
    if (hiredByStart && !termedByStart) rec.start++;
    if (e.status === 'active') rec.end++;
  }
  for (const e of terminationsInPeriod) {
    const name = e.properties?.name ?? '—';
    ensureProp(e.property_id, name).terms++;
  }
  const byProperty = Array.from(byPropMap.entries())
    .map(([id, r]) => {
      const avg = Math.max(1, (r.start + r.end) / 2);
      const annual = fractionOfYear > 0 ? (r.terms / avg) * 100 / fractionOfYear : 0;
      return {
        property_id: id,
        name: r.name,
        terminations: r.terms,
        avgHeadcount: Math.round(avg),
        annualizedRate: Math.round(annual),
        critical: annual >= 100,
      };
    })
    .sort((a, b) => b.annualizedRate - a.annualizedRate);

  // ── By position ──────────────────────────────────────────
  const byPosMap = new Map<string, { title: string; terms: number; start: number; end: number; vol: number; invol: number }>();
  const ensurePos = (id: string, title: string) => {
    if (!byPosMap.has(id)) byPosMap.set(id, { title, terms: 0, start: 0, end: 0, vol: 0, invol: 0 });
    return byPosMap.get(id)!;
  };
  for (const e of employees) {
    if (!e.position_id) continue;
    const title = e.positions?.title ?? '—';
    const rec = ensurePos(e.position_id, title);
    const hiredByStart = e.hire_date ? new Date(e.hire_date) <= periodStart : false;
    const termedByStart = e.termination_date && new Date(e.termination_date) <= periodStart;
    if (hiredByStart && !termedByStart) rec.start++;
    if (e.status === 'active') rec.end++;
  }
  for (const e of terminationsInPeriod) {
    if (!e.position_id) continue;
    const title = e.positions?.title ?? '—';
    const rec = ensurePos(e.position_id, title);
    rec.terms++;
    const t = termTypeByEmp.get(e.id);
    if (t === 'voluntary' || t === 'retirement') rec.vol++;
    else if (t === 'involuntary' || t === 'layoff' || t === 'contract_end') rec.invol++;
  }
  const byPosition = Array.from(byPosMap.entries())
    .map(([id, r]) => {
      const avg = Math.max(1, (r.start + r.end) / 2);
      const annual = fractionOfYear > 0 ? (r.terms / avg) * 100 / fractionOfYear : 0;
      return {
        position_id: id,
        title: r.title,
        terminations: r.terms,
        avgHeadcount: Math.round(avg),
        annualizedRate: Math.round(annual),
        voluntary: r.vol,
        involuntary: r.invol,
      };
    })
    .filter((r) => r.terminations > 0)
    .sort((a, b) => b.annualizedRate - a.annualizedRate);

  // ── Monthly trend (last 12 months regardless of period) ──
  const trend: { month: string; terminations: number; hires: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const terms = employees.filter(
      (e) =>
        e.termination_date &&
        new Date(e.termination_date) >= d &&
        new Date(e.termination_date) < next
    ).length;
    const hires = employees.filter(
      (e) => e.hire_date && new Date(e.hire_date) >= d && new Date(e.hire_date) < next
    ).length;
    trend.push({ month: label, terminations: terms, hires });
  }

  return NextResponse.json({
    overview: {
      annualizedRate: Math.round(annualizedRate),
      terminations: terminationsInPeriod.length,
      hires: hiresInPeriod.length,
      netChange: hiresInPeriod.length - terminationsInPeriod.length,
      avgTenureDays,
      startHeadcount,
      endHeadcount,
      voluntary,
      involuntary,
      periodDays,
    },
    byProperty,
    byPosition,
    trend,
  });
}

function emptyResult() {
  return {
    overview: {
      annualizedRate: 0, terminations: 0, hires: 0, netChange: 0,
      avgTenureDays: null, startHeadcount: 0, endHeadcount: 0,
      voluntary: 0, involuntary: 0, periodDays: 365,
    },
    byProperty: [],
    byPosition: [],
    trend: [],
  };
}
