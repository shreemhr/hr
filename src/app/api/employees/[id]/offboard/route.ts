import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';
import { notifyOffboardingStarted } from '@/lib/notify';

const DEFAULT_TASKS = [
  { title: 'Return uniform and name tag',        category: 'equipment',      sort_order: 0 },
  { title: 'Return key card / access badge',     category: 'access',         sort_order: 1 },
  { title: 'Return parking pass or locker key',  category: 'equipment',      sort_order: 2 },
  { title: 'Disable system access',              category: 'access',         sort_order: 3 },
  { title: 'Schedule exit interview',            category: 'documentation',  sort_order: 4 },
  { title: 'Conduct exit interview',             category: 'documentation',  sort_order: 5 },
  { title: 'Process final paycheck',             category: 'payroll',        sort_order: 6 },
  { title: 'Confirm PTO payout if applicable',  category: 'payroll',        sort_order: 7 },
  { title: 'Remove from scheduling systems',     category: 'access',         sort_order: 8 },
  { title: 'Collect personal items from property', category: 'general',     sort_order: 9 },
  { title: 'Provide reference policy information', category: 'documentation', sort_order: 10 },
  { title: 'Update emergency contact records',   category: 'documentation',  sort_order: 11 },
];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const { data: emp } = await supabase
    .from('employees')
    .select('property_id')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: record } = await supabase
    .from('offboarding_records')
    .select('*')
    .eq('company_id', session.companyId)
    .eq('employee_id', params.id)
    .order('initiated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record) return NextResponse.json({ record: null, tasks: [] });

  const { data: tasks } = await supabase
    .from('offboarding_tasks')
    .select('*')
    .eq('record_id', record.id)
    .order('sort_order');

  return NextResponse.json({ record, tasks: tasks ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const { data: emp } = await supabase
    .from('employees')
    .select('property_id, first_name, last_name, email')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { termination_type, last_day, rehire_eligible, notes, notify_email } = body;

  // Check not already started
  const { data: existing } = await supabase
    .from('offboarding_records')
    .select('id')
    .eq('company_id', session.companyId)
    .eq('employee_id', params.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: 'Offboarding already started for this employee' }, { status: 409 });

  // Create offboarding record
  const { data: record, error: rErr } = await supabase
    .from('offboarding_records')
    .insert({
      company_id:        session.companyId,
      employee_id:       params.id,
      termination_type:  termination_type ?? null,
      last_day:          last_day ?? null,
      rehire_eligible:   rehire_eligible ?? null,
      notes:             notes?.trim() ?? null,
      initiated_by:      session.userId,
      status:            'in_progress',
    })
    .select()
    .single();

  if (rErr || !record) return NextResponse.json({ error: rErr?.message }, { status: 500 });

  // Create default tasks
  await supabase.from('offboarding_tasks').insert(
    DEFAULT_TASKS.map(t => ({
      ...t,
      company_id:  session.companyId,
      record_id:   record.id,
      employee_id: params.id,
      status:      'pending',
    }))
  );

  // Update employee status
  await supabase
    .from('employees')
    .update({ status: 'terminated', termination_date: last_day ?? null, termination_reason: termination_type ?? null })
    .eq('id', params.id)
    .eq('company_id', session.companyId);

  // Notification
  if (notify_email) {
    const { data: notifyUser } = await supabase
      .from('users')
      .select('name')
      .eq('id', session.userId)
      .single();

    await notifyOffboardingStarted({
      company_id:    session.companyId,
      to_email:      notify_email,
      manager_name:  notifyUser?.name ?? session.name ?? 'Manager',
      employee_name: `${emp.first_name} ${emp.last_name}`,
      last_day:      last_day ?? null,
      employee_id:   params.id,
    });
  }

  return NextResponse.json({ record, message: `${DEFAULT_TASKS.length} offboarding tasks created` }, { status: 201 });
}
