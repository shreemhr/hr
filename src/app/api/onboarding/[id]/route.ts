import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession();

  // Fetch task to verify ownership
  const { data: task } = await supabase
    .from('onboarding_tasks')
    .select('id, employee_id, status')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  // Verify user can manage this employee's property
  const { data: emp } = await supabase
    .from('employees')
    .select('property_id')
    .eq('id', task.employee_id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp || !canManageProperty(session, emp.property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { status, notes } = body;

  const validStatuses = ['pending', 'collected', 'na'];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status) {
    updates.status = status;
    updates.collected_at = status === 'collected' ? new Date().toISOString() : null;
  }
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from('onboarding_tasks')
    .update(updates)
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalculate and update employee onboarding_status
  const { data: allTasks } = await supabase
    .from('onboarding_tasks')
    .select('status')
    .eq('company_id', session.companyId)
    .eq('employee_id', task.employee_id);

  const total = (allTasks ?? []).length;
  const pending = (allTasks ?? []).filter(t => t.status === 'pending').length;

  let onboarding_status = 'in_progress';
  if (total > 0 && pending === 0) onboarding_status = 'complete';

  await supabase
    .from('employees')
    .update({ onboarding_status })
    .eq('id', task.employee_id)
    .eq('company_id', session.companyId);

  return NextResponse.json(data);
}
