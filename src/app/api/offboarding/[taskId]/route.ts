import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const session = await requireSession();

  const { data: task } = await supabase
    .from('offboarding_tasks')
    .select('id, record_id, employee_id')
    .eq('id', params.taskId)
    .eq('company_id', session.companyId)
    .single();

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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

  const updates: Record<string, unknown> = {};
  if (status) {
    updates.status       = status;
    updates.completed_at = status === 'complete' ? new Date().toISOString() : null;
    updates.completed_by = status === 'complete' ? session.userId : null;
  }
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from('offboarding_tasks')
    .update(updates)
    .eq('id', params.taskId)
    .eq('company_id', session.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if all tasks complete → update record status
  const { data: allTasks } = await supabase
    .from('offboarding_tasks')
    .select('status')
    .eq('record_id', task.record_id);

  const allDone = (allTasks ?? []).every(t => t.status !== 'pending');
  if (allDone) {
    await supabase
      .from('offboarding_records')
      .update({ status: 'complete' })
      .eq('id', task.record_id);
  }

  return NextResponse.json(data);
}
