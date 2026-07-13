import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession();

  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      properties(id, name, state, city, address, brand),
      positions(id, title, department, pay_type)
    `)
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  if (!canManageProperty(session, data.property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession();

  // Verify employee exists in this company
  const { data: emp } = await supabase
    .from('employees')
    .select('id, property_id, position_id, pay_rate, first_name, last_name')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  if (!canManageProperty(session, emp.property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const allowed = [
    'first_name', 'last_name', 'email', 'phone', 'hire_date',
    'property_id', 'position_id', 'employment_type', 'pay_rate',
    'address', 'city', 'state', 'zip', 'status', 'onboarding_status',
    'termination_date', 'termination_reason',
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // ── Pay band enforcement (only when pay or position is changing) ──
  let payFlagged = false;
  if ('pay_rate' in body || 'position_id' in body) {
    const effectiveRate = 'pay_rate' in body ? body.pay_rate : emp.pay_rate;
    const effectivePos  = 'position_id' in body ? body.position_id : emp.position_id;
    const { checkPayAgainstBand, formatRate } = await import('@/lib/payband');
    const band = await checkPayAgainstBand(session.companyId, effectivePos, effectiveRate);

    if (!band.ok && band.mode === 'hard') {
      return NextResponse.json({
        error: `${formatRate(band.rate!, band.payType)} is outside the approved band for ${band.positionTitle ?? 'this role'} (${band.min != null ? formatRate(band.min, band.payType) : '—'} – ${band.max != null ? formatRate(band.max, band.payType) : '—'}). Corporate approval is required.`,
        code: 'PAY_BAND_EXCEEDED',
        band: { min: band.min, max: band.max, breach: band.breach, rate: band.rate, mode: band.mode, positionTitle: band.positionTitle, payType: band.payType },
      }, { status: 422 });
    }
    if (!band.ok && band.mode === 'soft') payFlagged = true;
  }
  // ──────────────────────────────────────────────────────

  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (payFlagged && data) {
    try {
      const { notifyPayBandSoftFlag } = await import('@/lib/notify');
      const { checkPayAgainstBand } = await import('@/lib/payband');
      const band = await checkPayAgainstBand(session.companyId, data.position_id, data.pay_rate);
      await notifyPayBandSoftFlag(session.companyId, {
        employeeName: `${data.first_name} ${data.last_name}`,
        rate: band.rate ?? Number(data.pay_rate), min: band.min, max: band.max,
        positionTitle: band.positionTitle, payType: band.payType,
        byName: session.name,
      });
    } catch { /* best-effort */ }
  }

  return NextResponse.json(payFlagged ? { ...data, pay_flagged: true } : data);
}
