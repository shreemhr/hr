import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const [tRes, iRes] = await Promise.all([
    supabase.from('checklist_templates').select('*').eq('id', params.id).eq('company_id', session.companyId).single(),
    supabase.from('checklist_template_items').select('*').eq('template_id', params.id).eq('company_id', session.companyId).order('sort_order'),
  ]);

  if (!tRes.data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ template: tRes.data, items: iRes.data ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const allowed = ['name', 'description', 'category', 'active'];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) updates[k] = body[k];

  const { data, error } = await supabase
    .from('checklist_templates')
    .update(updates)
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabase.from('checklist_templates').delete().eq('id', params.id).eq('company_id', session.companyId);
  return NextResponse.json({ ok: true });
}
