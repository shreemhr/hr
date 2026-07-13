import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title, description } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 });

  // Get current max sort_order
  const { data: existing } = await supabase
    .from('checklist_template_items')
    .select('sort_order')
    .eq('template_id', params.id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing?.length ? (existing[0].sort_order + 1) : 0;

  const { data, error } = await supabase
    .from('checklist_template_items')
    .insert({
      template_id:  params.id,
      company_id:   session.companyId,
      title:        title.trim(),
      description:  description?.trim() ?? null,
      sort_order:   nextOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('item_id');
  if (!itemId) return NextResponse.json({ error: 'item_id required' }, { status: 400 });

  await supabase.from('checklist_template_items').delete().eq('id', itemId).eq('template_id', params.id);
  return NextResponse.json({ ok: true });
}
