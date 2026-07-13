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
    .from('performance_reviews')
    .select('*, users(name)')
    .eq('company_id', session.companyId)
    .eq('employee_id', params.id)
    .order('review_date', { ascending: false });

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
  const { review_period, review_date, rating, overall_comments, goals_next_period, status } = body;

  if (!review_date) return NextResponse.json({ error: 'review_date required' }, { status: 400 });

  const { data, error } = await supabase
    .from('performance_reviews')
    .insert({
      company_id:        session.companyId,
      employee_id:       params.id,
      review_period:     review_period?.trim() ?? null,
      review_date,
      reviewer_id:       session.userId,
      rating:            rating ?? null,
      overall_comments:  overall_comments?.trim() ?? null,
      goals_next_period: goals_next_period?.trim() ?? null,
      status:            status ?? 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const body = await req.json();
  const { review_id, ...updates } = body;
  if (!review_id) return NextResponse.json({ error: 'review_id required' }, { status: 400 });

  const allowed = ['review_period', 'review_date', 'rating', 'overall_comments', 'goals_next_period', 'employee_comments', 'status'];
  const clean: Record<string, unknown> = {};
  for (const k of allowed) if (k in updates) clean[k] = updates[k];

  const { data, error } = await supabase
    .from('performance_reviews')
    .update(clean)
    .eq('id', review_id)
    .eq('company_id', session.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
