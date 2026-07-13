import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession();

  // params.id is the employee_id
  const { data: emp } = await supabase
    .from('employees')
    .select('id, property_id, first_name, last_name, hire_date, pay_rate, employment_type, positions(title, pay_type), properties(name, state, brand, city)')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch latest saved offer letter
  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', session.companyId)
    .eq('employee_id', params.id)
    .eq('type', 'offer_letter')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch company
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', session.companyId)
    .single();

  return NextResponse.json({ employee: emp, document: doc, company });
}

export async function POST(
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

  const body = await req.json();
  const { content } = body; // OfferLetterData object

  if (!content) {
    return NextResponse.json({ error: 'content required' }, { status: 400 });
  }

  const empName = `${content.employeeFirst ?? ''} ${content.employeeLast ?? ''}`.trim();

  // Upsert: delete existing and insert new (keeps history simple)
  await supabase
    .from('documents')
    .delete()
    .eq('company_id', session.companyId)
    .eq('employee_id', params.id)
    .eq('type', 'offer_letter');

  const { data, error } = await supabase
    .from('documents')
    .insert({
      company_id: session.companyId,
      employee_id: params.id,
      type: 'offer_letter',
      title: `Offer Letter — ${empName}`,
      content,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
