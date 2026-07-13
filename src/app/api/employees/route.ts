import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin, canManageProperty } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get('property_id');
  const status = searchParams.get('status');

  let query = supabase
    .from('employees')
    .select(`
      id, first_name, last_name, email, phone, hire_date,
      status, onboarding_status, property_id, position_id,
      properties(name, state),
      positions(title)
    `)
    .eq('company_id', session.companyId)
    .order('last_name');

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  } else if (!isAdmin(session.role)) {
    if (session.propertyIds?.length) {
      query = query.in('property_id', session.propertyIds);
    } else {
      return NextResponse.json([]);
    }
  }

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();

  const body = await req.json();
  const {
    first_name, last_name, email, phone,
    hire_date, property_id, position_id,
    employment_type, pay_rate, address, city, state, zip,
  } = body;

  if (!first_name || !last_name || !property_id) {
    return NextResponse.json({ error: 'first_name, last_name, property_id required' }, { status: 400 });
  }

  if (!canManageProperty(session, property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Seat limit check ───────────────────────────────────
  const { data: company } = await supabase
    .from('companies')
    .select('plan')
    .eq('id', session.companyId)
    .single();

  const { PLANS } = await import('@/lib/product');
  const planKey   = (company?.plan ?? 'trial') as keyof typeof PLANS;
  const seatLimit = PLANS[planKey]?.seatLimit ?? null;

  if (seatLimit) {
    const { count } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', session.companyId)
      .eq('status', 'active');

    if ((count ?? 0) >= seatLimit) {
      return NextResponse.json({
        error: `Seat limit reached. Your ${PLANS[planKey]?.label} plan allows up to ${seatLimit} employees. Upgrade at /billing.`,
        code:  'SEAT_LIMIT_REACHED',
      }, { status: 402 });
    }
  }
  // ──────────────────────────────────────────────────────

  // ── Pay band enforcement ──────────────────────────────
  const { checkPayAgainstBand, formatRate } = await import('@/lib/payband');
  const band = await checkPayAgainstBand(session.companyId, position_id, pay_rate);
  let payFlagged = false;

  if (!band.ok && band.mode === 'hard') {
    return NextResponse.json({
      error: `${formatRate(band.rate!, band.payType)} is outside the approved band for ${band.positionTitle ?? 'this role'} (${band.min != null ? formatRate(band.min, band.payType) : '—'} – ${band.max != null ? formatRate(band.max, band.payType) : '—'}). Corporate approval is required.`,
      code: 'PAY_BAND_EXCEEDED',
      band: { min: band.min, max: band.max, breach: band.breach, rate: band.rate, mode: band.mode, positionTitle: band.positionTitle, payType: band.payType },
    }, { status: 422 });
  }
  if (!band.ok && band.mode === 'soft') {
    payFlagged = true;  // saved, but corporate is notified below
  }
  // ──────────────────────────────────────────────────────

  const { data, error } = await supabase
    .from('employees')
    .insert({
      company_id: session.companyId,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email?.toLowerCase().trim() ?? null,
      phone: phone?.trim() ?? null,
      hire_date: hire_date ?? null,
      property_id,
      position_id: position_id ?? null,
      employment_type: employment_type ?? 'full_time',
      pay_rate: pay_rate ?? null,
      address: address?.trim() ?? null,
      city: city?.trim() ?? null,
      state: state?.toUpperCase() ?? null,
      zip: zip?.trim() ?? null,
      status: 'active',
      onboarding_status: 'not_started',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Soft-mode out-of-band pay: notify corporate (non-blocking)
  if (payFlagged && data) {
    try {
      const { notifyPayBandSoftFlag } = await import('@/lib/notify');
      await notifyPayBandSoftFlag(session.companyId, {
        employeeName: `${data.first_name} ${data.last_name}`,
        rate: band.rate!, min: band.min, max: band.max,
        positionTitle: band.positionTitle, payType: band.payType,
        byName: session.name,
      });
    } catch { /* notification is best-effort */ }
  }

  return NextResponse.json(payFlagged ? { ...data, pay_flagged: true } : data, { status: 201 });
}
