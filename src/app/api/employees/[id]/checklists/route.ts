import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  // Verify access
  const { data: emp } = await supabase
    .from('employees')
    .select('property_id')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Get assignments with template info
  const { data: assignments } = await supabase
    .from('checklist_assignments')
    .select(`
      id, assigned_at,
      checklist_templates(id, name, description, category)
    `)
    .eq('employee_id', params.id)
    .eq('company_id', session.companyId)
    .order('assigned_at', { ascending: false });

  if (!assignments?.length) return NextResponse.json([]);

  const assignIds = assignments.map(a => a.id);

  // Get items and completions for all assignments
  const [itemsRes, completionsRes] = await Promise.all([
    supabase
      .from('checklist_template_items')
      .select('id, template_id, title, description, sort_order')
      .in('template_id', assignments.map(a => (a.checklist_templates as unknown as { id: string })?.id).filter(Boolean)),
    supabase
      .from('checklist_item_completions')
      .select('id, assignment_id, item_id, status, completed_at, notes')
      .in('assignment_id', assignIds),
  ]);

  const items       = itemsRes.data ?? [];
  const completions = completionsRes.data ?? [];

  // Build completion lookup: assignment_id + item_id → completion
  const compLookup = new Map<string, typeof completions[0]>();
  for (const c of completions) compLookup.set(`${c.assignment_id}:${c.item_id}`, c);

  return NextResponse.json(assignments.map(a => {
    const tpl = a.checklist_templates as unknown as { id: string; name: string; description: string | null; category: string } | null;
    const tplItems = items.filter(it => it.template_id === tpl?.id).sort((a, b) => a.sort_order - b.sort_order);

    const enrichedItems = tplItems.map(it => {
      const comp = compLookup.get(`${a.id}:${it.id}`);
      return {
        item_id:      it.id,
        completion_id: comp?.id ?? null,
        title:        it.title,
        description:  it.description,
        status:       comp?.status ?? 'pending',
        completed_at: comp?.completed_at ?? null,
        notes:        comp?.notes ?? null,
      };
    });

    const done = enrichedItems.filter(it => it.status === 'complete' || it.status === 'na').length;
    const total = enrichedItems.length;

    return {
      assignment_id: a.id,
      assigned_at:   a.assigned_at,
      template: tpl,
      items: enrichedItems,
      summary: { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 },
    };
  }));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const { data: emp } = await supabase
    .from('employees')
    .select('property_id')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { completion_id, status, notes } = body;

  if (!completion_id) return NextResponse.json({ error: 'completion_id required' }, { status: 400 });

  const validStatuses = ['pending', 'complete', 'na'];
  if (status && !validStatuses.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status)           updates.status       = status;
  if (notes !== undefined) updates.notes     = notes;
  if (status === 'complete') updates.completed_at = new Date().toISOString();
  if (status === 'pending')  updates.completed_at = null;

  const { data, error } = await supabase
    .from('checklist_item_completions')
    .update(updates)
    .eq('id', completion_id)
    .eq('company_id', session.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
