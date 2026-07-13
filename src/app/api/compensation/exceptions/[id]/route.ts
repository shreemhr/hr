import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

// PATCH /api/compensation/exceptions/[id]  { decision: 'approved'|'denied', note?: string }
// Corporate-only. On approval, applies the requested rate to the employee.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession();

  // Hard gate: only owner / vp_ops may decide pay exceptions.
  if (!isAdmin(session.role)) {
    return NextResponse.json({ error: 'Only corporate (Owner / VP Operations) can decide pay exceptions.' }, { status: 403 });
  }

  const body = await req.json();
  const decision = body.decision;
  if (decision !== 'approved' && decision !== 'denied') {
    return NextResponse.json({ error: "decision must be 'approved' or 'denied'" }, { status: 400 });
  }

  // Load the exception, scoped to this company
  const { data: exc } = await supabase
    .from('pay_exceptions')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!exc) return NextResponse.json({ error: 'Exception not found' }, { status: 404 });
  if (exc.status !== 'pending') {
    return NextResponse.json({ error: 'This request has already been decided.' }, { status: 409 });
  }

  // Record the decision (with attribution + timestamp)
  const { data: updated, error: updErr } = await supabase
    .from('pay_exceptions')
    .update({
      status: decision,
      decided_by: session.userId,
      decided_by_name: session.name,
      decided_at: new Date().toISOString(),
      decision_note: body.note?.trim() ?? null,
    })
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .eq('status', 'pending')      // guard against double-decision race
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: 'This request has already been decided.' }, { status: 409 });

  // On approval, apply the rate to the employee record (bypasses band — this IS the approval)
  if (decision === 'approved' && exc.employee_id) {
    await supabase
      .from('employees')
      .update({ pay_rate: exc.requested_rate })
      .eq('id', exc.employee_id)
      .eq('company_id', session.companyId);
  }

  // Notify the original requester of the outcome
  try {
    if (exc.requested_by) {
      const { data: requester } = await supabase
        .from('users').select('email').eq('id', exc.requested_by).single();
      const { data: emp } = await supabase
        .from('employees').select('first_name, last_name').eq('id', exc.employee_id).single();
      if (requester?.email) {
        const { notifyPayExceptionDecided } = await import('@/lib/notify');
        await notifyPayExceptionDecided(session.companyId, {
          to_email: requester.email,
          employeeName: emp ? `${emp.first_name} ${emp.last_name}` : 'employee',
          rate: Number(exc.requested_rate),
          payType: exc.pay_type ?? 'hourly',
          outcome: decision,
          deciderName: session.name,
          note: body.note ?? '',
        });
      }
    }
  } catch { /* best-effort */ }

  return NextResponse.json(updated);
}
