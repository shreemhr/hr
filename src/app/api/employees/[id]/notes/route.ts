import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';

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

  const { data } = await supabase
    .from('employee_notes')
    .select('*, users(name)')
    .eq('company_id', session.companyId)
    .eq('employee_id', params.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { type, content } = body;

  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const { data, error } = await supabase
    .from('employee_notes')
    .insert({
      company_id:  session.companyId,
      employee_id: params.id,
      author_id:   session.userId,
      type:        type ?? 'general',
      content:     content.trim(),
      private:     true,
    })
    .select('*, users(name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get('note_id');
  if (!noteId) return NextResponse.json({ error: 'note_id required' }, { status: 400 });

  // Only the author or admin can delete
  const { data: note } = await supabase
    .from('employee_notes')
    .select('author_id')
    .eq('id', noteId)
    .eq('company_id', session.companyId)
    .single();

  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (note.author_id !== session.userId && session.role !== 'owner' && session.role !== 'vp_ops') {
    return NextResponse.json({ error: 'You can only delete your own notes' }, { status: 403 });
  }

  await supabase.from('employee_notes').delete().eq('id', noteId).eq('company_id', session.companyId);
  return NextResponse.json({ ok: true });
}
