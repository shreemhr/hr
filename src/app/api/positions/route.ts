import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

export async function GET() {
  const session = await requireSession();

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('company_id', session.companyId)
    .order('title');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();

  if (!isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { title, department, pay_type, pay_rate, headcount_target, property_ids } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('positions')
    .insert({
      company_id: session.companyId,
      title: title.trim(),
      department: department?.trim() ?? null,
      pay_type: pay_type ?? 'hourly',
      pay_rate: pay_rate ?? null,
      headcount_target:
        headcount_target === '' || headcount_target == null
          ? null
          : Number(headcount_target),
      property_ids: Array.isArray(property_ids) ? property_ids : [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
