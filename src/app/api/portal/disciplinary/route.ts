import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePortalSession } from '@/lib/portal-session';

export async function GET() {
  const session = await requirePortalSession();

  const { data } = await supabase
    .from('disciplinary_records')
    .select('id, type, issued_date, incident_date, description, action_taken, follow_up_date, employee_acknowledged, employee_acknowledged_at')
    .eq('company_id', session.companyId)
    .eq('employee_id', session.employeeId)
    .order('issued_date', { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await requirePortalSession();

  const { record_id, employee_response } = await req.json();
  if (!record_id) return NextResponse.json({ error: 'record_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('disciplinary_records')
    .update({
      employee_acknowledged:    true,
      employee_acknowledged_at: new Date().toISOString(),
      employee_response:        employee_response?.trim() ?? null,
    })
    .eq('id', record_id)
    .eq('company_id', session.companyId)
    .eq('employee_id', session.employeeId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
