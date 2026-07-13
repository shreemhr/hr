import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

// GET /api/reports/hiring?property_id=xxx
// Returns vacancy data per position. open = headcount_target - active employees.
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get('property_id');

  // Scope properties for non-admins
  const scopedPropertyIds =
    !isAdmin(session.role) ? (session.propertyIds ?? []) : null;

  if (scopedPropertyIds && scopedPropertyIds.length === 0) {
    return NextResponse.json({ rows: [], totalOpen: 0 });
  }

  // Positions that have a headcount target set
  let posQuery = supabase
    .from('positions')
    .select('id, title, department, headcount_target')
    .eq('company_id', session.companyId)
    .not('headcount_target', 'is', null)
    .order('title');

  const { data: positions, error: posErr } = await posQuery;
  if (posErr) return NextResponse.json({ error: posErr.message }, { status: 500 });

  // Active employees (filtered to scope/property) — count per position
  let empQuery = supabase
    .from('employees')
    .select('position_id, property_id, properties(name)')
    .eq('company_id', session.companyId)
    .eq('status', 'active');

  if (propertyId) {
    empQuery = empQuery.eq('property_id', propertyId);
  } else if (scopedPropertyIds) {
    empQuery = empQuery.in('property_id', scopedPropertyIds);
  }

  const { data: employees, error: empErr } = await empQuery;
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });

  // Count active employees per position_id
  const fillByPosition = new Map<string, number>();
  for (const e of employees ?? []) {
    if (!e.position_id) continue;
    fillByPosition.set(e.position_id, (fillByPosition.get(e.position_id) ?? 0) + 1);
  }

  const rows = (positions ?? []).map((p) => {
    const target = p.headcount_target ?? 0;
    const filled = fillByPosition.get(p.id) ?? 0;
    const open   = Math.max(0, target - filled);
    const fillRate = target > 0 ? Math.round((filled / target) * 100) : 0;
    return {
      position_id: p.id,
      title:       p.title,
      department:  p.department,
      target,
      filled,
      open,
      fillRate,
    };
  });

  // Most-open first
  rows.sort((a, b) => b.open - a.open || a.title.localeCompare(b.title));

  const totalOpen = rows.reduce((sum, r) => sum + r.open, 0);

  return NextResponse.json({ rows, totalOpen });
}
