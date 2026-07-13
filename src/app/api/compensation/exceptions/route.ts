import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin, canManageProperty } from '@/lib/auth';

// GET /api/compensation/exceptions?status=pending  (admin sees all; others see their own requests)
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('pay_exceptions')
    .select(`
      *,
      employees(first_name, last_name, property_id),
      positions(title, department)
    `)
    .eq('company_id', session.companyId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  // Non-admins only see exceptions they requested
  if (!isAdmin(session.role)) {
    query = query.eq('requested_by', session.userId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST /api/compensation/exceptions  — request an exception (GM/HR)
export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();
  const { employee_id, position_id, requested_rate, reason } = body;

  if (!employee_id || requested_rate == null) {
    return NextResponse.json({ error: 'employee_id and requested_rate are required' }, { status: 400 });
  }

  // Verify the employee belongs to this company and the requester can manage them
  const { data: emp } = await supabase
    .from('employees')
    .select('id, property_id, position_id, first_name, last_name')
    .eq('id', employee_id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const posId = position_id ?? emp.position_id;

  // Re-derive the band server-side — never trust client band values
  const { checkPayAgainstBand } = await import('@/lib/payband');
  const band = await checkPayAgainstBand(session.companyId, posId, requested_rate);

  // Only allow exception requests that are actually out of band
  if (band.ok) {
    return NextResponse.json({ error: 'This rate is within the approved band — no exception needed.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('pay_exceptions')
    .insert({
      company_id: session.companyId,
      employee_id,
      position_id: posId ?? null,
      requested_rate: Number(requested_rate),
      band_min: band.min,
      band_max: band.max,
      pay_type: band.payType,
      reason: reason?.trim() ?? null,
      status: 'pending',
      requested_by: session.userId,
      requested_by_name: session.name,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify corporate
  try {
    const { notifyPayExceptionRequested } = await import('@/lib/notify');
    await notifyPayExceptionRequested(session.companyId, {
      employeeName: `${emp.first_name} ${emp.last_name}`,
      rate: Number(requested_rate),
      min: band.min, max: band.max,
      positionTitle: band.positionTitle, payType: band.payType,
      byName: session.name, reason: reason ?? '', exceptionId: data.id,
    });
  } catch { /* best-effort */ }

  return NextResponse.json(data, { status: 201 });
}
