import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; recordId: string } }
) {
  const session = await requireSession();

  const { data: record } = await supabase
    .from('disciplinary_records')
    .select('employee_id')
    .eq('id', params.recordId)
    .eq('company_id', session.companyId)
    .single();

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: emp } = await supabase
    .from('employees')
    .select('property_id')
    .eq('id', record.employee_id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp || !canManageProperty(session, emp.property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ['action_taken', 'follow_up_date', 'employee_acknowledged', 'employee_response'];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) updates[k] = body[k];

  if (body.employee_acknowledged === true && !updates.employee_acknowledged_at) {
    updates.employee_acknowledged_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('disciplinary_records')
    .update(updates)
    .eq('id', params.recordId)
    .eq('company_id', session.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; recordId: string } }
) {
  const session = await requireSession();

  const { error } = await supabase
    .from('disciplinary_records')
    .delete()
    .eq('id', params.recordId)
    .eq('company_id', session.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
