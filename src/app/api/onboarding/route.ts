import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin, canManageProperty } from '@/lib/auth';
import { getFormsForState } from '@/lib/stateforms';

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // pending | complete | all
  const employeeId = searchParams.get('employee_id');

  // Fetch employees scoped to this company (and property for non-admins)
  let empQuery = supabase
    .from('employees')
    .select('id, first_name, last_name, property_id, hire_date, onboarding_status, properties(name, state)')
    .eq('company_id', session.companyId);

  if (!isAdmin(session.role) && session.propertyIds?.length) {
    empQuery = empQuery.in('property_id', session.propertyIds);
  }

  if (employeeId) empQuery = empQuery.eq('id', employeeId);

  const { data: employees } = await empQuery;
  if (!employees?.length) return NextResponse.json([]);

  const empIds = employees.map(e => e.id);

  // Fetch all onboarding tasks for these employees
  const { data: tasks } = await supabase
    .from('onboarding_tasks')
    .select('*')
    .eq('company_id', session.companyId)
    .in('employee_id', empIds);

  // Build per-employee summary
  const taskMap = new Map<string, typeof tasks>();
  for (const task of tasks ?? []) {
    if (!taskMap.has(task.employee_id)) taskMap.set(task.employee_id, []);
    taskMap.get(task.employee_id)!.push(task);
  }

  const result = employees
    .map(emp => {
      const empTasks = taskMap.get(emp.id) ?? [];
      const total = empTasks.length;
      const done = empTasks.filter(t => t.status === 'collected' || t.status === 'na').length;
      const pending = empTasks.filter(t => t.status === 'pending').length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const isComplete = total > 0 && pending === 0;
      const isStarted = total > 0;

      return {
        employee: emp,
        tasks: empTasks,
        summary: { total, done, pending, pct, isComplete, isStarted },
      };
    })
    .filter(item => {
      if (status === 'pending') return item.summary.isStarted && !item.summary.isComplete;
      if (status === 'complete') return item.summary.isComplete;
      if (status === 'not_started') return !item.summary.isStarted;
      return true; // 'all'
    });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();

  const body = await req.json();
  const { employee_id } = body;

  if (!employee_id) {
    return NextResponse.json({ error: 'employee_id required' }, { status: 400 });
  }

  // Fetch employee with property
  const { data: emp } = await supabase
    .from('employees')
    .select('id, first_name, last_name, property_id, properties(state)')
    .eq('id', employee_id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  if (!canManageProperty(session, emp.property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const prop = emp.properties as unknown as { state: string } | null;
  const stateCode = prop?.state ?? 'TX';
  const forms = getFormsForState(stateCode);

  // Check if tasks already exist
  const { data: existing } = await supabase
    .from('onboarding_tasks')
    .select('id')
    .eq('company_id', session.companyId)
    .eq('employee_id', employee_id)
    .limit(1);

  if (existing?.length) {
    return NextResponse.json({ error: 'Onboarding already started for this employee' }, { status: 409 });
  }

  // Create tasks
  const rows = forms.map(f => ({
    company_id: session.companyId,
    employee_id,
    form_id: f.id,
    form_name: f.name,
    short_name: f.shortName,
    description: f.description,
    link: f.link ?? null,
    federal: f.federal ?? false,
    status: 'pending' as const,
  }));

  const { data: created, error } = await supabase
    .from('onboarding_tasks')
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update employee onboarding_status
  await supabase
    .from('employees')
    .update({ onboarding_status: 'in_progress' })
    .eq('id', employee_id)
    .eq('company_id', session.companyId);

  return NextResponse.json(created, { status: 201 });
}
