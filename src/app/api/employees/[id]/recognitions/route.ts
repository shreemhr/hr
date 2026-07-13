import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';

// GET /api/employees/[id]/recognitions
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession();

  const { data: emp } = await supabase
    .from('employees')
    .select('id, property_id')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('recognitions')
    .select('*')
    .eq('company_id', session.companyId)
    .eq('employee_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/employees/[id]/recognitions  { category, note }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession();
  const body = await req.json();

  const { data: emp } = await supabase
    .from('employees')
    .select('id, property_id')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validCategories = ['kudos', 'spot_award', 'guest_praise', 'milestone', 'teamwork'];
  const category = validCategories.includes(body.category) ? body.category : 'kudos';

  const { data, error } = await supabase
    .from('recognitions')
    .insert({
      company_id: session.companyId,
      employee_id: params.id,
      category,
      note: body.note?.trim() ?? null,
      given_by: session.userId,
      given_by_name: session.name,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
