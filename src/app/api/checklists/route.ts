import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

export async function GET() {
  const session = await requireSession();

  const { data: templates } = await supabase
    .from('checklist_templates')
    .select('id, name, description, category, active, created_at')
    .eq('company_id', session.companyId)
    .order('name');

  if (!templates) return NextResponse.json([]);

  // Get item counts and assignment counts
  const ids = templates.map(t => t.id);

  const [itemCounts, assignCounts] = await Promise.all([
    supabase
      .from('checklist_template_items')
      .select('template_id')
      .in('template_id', ids),
    supabase
      .from('checklist_assignments')
      .select('template_id')
      .in('template_id', ids),
  ]);

  const itemMap   = new Map<string, number>();
  const assignMap = new Map<string, number>();
  for (const r of itemCounts.data ?? [])  itemMap.set(r.template_id,   (itemMap.get(r.template_id)   ?? 0) + 1);
  for (const r of assignCounts.data ?? []) assignMap.set(r.template_id, (assignMap.get(r.template_id) ?? 0) + 1);

  return NextResponse.json(templates.map(t => ({
    ...t,
    item_count:       itemMap.get(t.id)   ?? 0,
    assignment_count: assignMap.get(t.id) ?? 0,
  })));
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, description, category, items } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const { data: template, error: tErr } = await supabase
    .from('checklist_templates')
    .insert({
      company_id:  session.companyId,
      name:        name.trim(),
      description: description ?? null,
      category:    category ?? 'general',
      active:      true,
    })
    .select()
    .single();

  if (tErr || !template) return NextResponse.json({ error: tErr?.message ?? 'Failed' }, { status: 500 });

  // Insert items
  if (items?.length) {
    const rows = (items as { title: string; description?: string }[])
      .filter(it => it.title?.trim())
      .map((it, i) => ({
        template_id:  template.id,
        company_id:   session.companyId,
        title:        it.title.trim(),
        description:  it.description?.trim() ?? null,
        sort_order:   i,
      }));

    if (rows.length) {
      await supabase.from('checklist_template_items').insert(rows);
    }
  }

  return NextResponse.json(template, { status: 201 });
}
