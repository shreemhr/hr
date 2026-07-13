import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const { data: assignments } = await supabase
    .from('checklist_assignments')
    .select(`
      id, assigned_at, employee_id,
      employees(id, first_name, last_name, property_id, properties(name))
    `)
    .eq('template_id', params.id)
    .eq('company_id', session.companyId)
    .order('assigned_at', { ascending: false });

  if (!assignments?.length) return NextResponse.json([]);

  // Get completion counts per assignment
  const assignIds = assignments.map(a => a.id);

  const { data: completions } = await supabase
    .from('checklist_item_completions')
    .select('assignment_id, status')
    .in('assignment_id', assignIds);

  // Get total items for this template
  const { count: totalItems } = await supabase
    .from('checklist_template_items')
    .select('*', { count: 'exact', head: true })
    .eq('template_id', params.id);

  const total = totalItems ?? 0;

  const compMap = new Map<string, number>();
  for (const c of completions ?? []) {
    if (c.status === 'complete' || c.status === 'na') {
      compMap.set(c.assignment_id, (compMap.get(c.assignment_id) ?? 0) + 1);
    }
  }

  return NextResponse.json(assignments.map(a => {
    const done = compMap.get(a.id) ?? 0;
    const emp = a.employees as unknown as { id: string; first_name: string; last_name: string; property_id: string; properties: { name: string } | null } | null;
    return {
      id: a.id,
      assigned_at: a.assigned_at,
      employee: emp,
      completion: { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 },
    };
  }));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const body = await req.json();
  const { employee_id } = body;

  if (!employee_id) return NextResponse.json({ error: 'employee_id required' }, { status: 400 });

  // Verify employee belongs to company and user can manage
  const { data: emp } = await supabase
    .from('employees')
    .select('id, property_id')
    .eq('id', employee_id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check not already assigned
  const { data: existing } = await supabase
    .from('checklist_assignments')
    .select('id')
    .eq('template_id', params.id)
    .eq('employee_id', employee_id)
    .single();

  if (existing) return NextResponse.json({ error: 'Already assigned to this employee' }, { status: 409 });

  // Create assignment
  const { data: assignment, error: aErr } = await supabase
    .from('checklist_assignments')
    .insert({
      company_id:  session.companyId,
      template_id: params.id,
      employee_id,
      assigned_by: session.userId,
    })
    .select()
    .single();

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  // Create completion rows for each item (status: pending)
  const { data: templateItems } = await supabase
    .from('checklist_template_items')
    .select('id')
    .eq('template_id', params.id);

  if (templateItems?.length) {
    await supabase.from('checklist_item_completions').insert(
      templateItems.map(item => ({
        company_id:    session.companyId,
        assignment_id: assignment.id,
        item_id:       item.id,
        employee_id,
        status:        'pending',
      }))
    );
  }

  return NextResponse.json(assignment, { status: 201 });
}
