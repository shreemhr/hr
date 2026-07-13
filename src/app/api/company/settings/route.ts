import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

export async function GET() {
  const session = await requireSession();

  const { data, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, primary_color, trial_ends_at, plan, created_at')
    .eq('id', session.companyId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();

  if (!isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ['name', 'logo_url', 'primary_color'];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', session.companyId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
