import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';
import { notifyWarningIssued } from '@/lib/notify';

const TYPE_LABELS: Record<string, string> = {
  verbal_warning:  'Verbal Warning',
  written_warning: 'Written Warning',
  final_warning:   'Final Warning',
  pip:             'Performance Improvement Plan',
  suspension:      'Suspension',
  other:           'Other',
};

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
    .from('disciplinary_records')
    .select('*, users(name)')
    .eq('company_id', session.companyId)
    .eq('employee_id', params.id)
    .order('issued_date', { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const { data: emp } = await supabase
    .from('employees')
    .select('property_id, first_name, last_name, email')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { type, incident_date, issued_date, description, action_taken, follow_up_date, notify_email } = body;

  if (!type || !issued_date || !description) {
    return NextResponse.json({ error: 'type, issued_date, description required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('disciplinary_records')
    .insert({
      company_id:    session.companyId,
      employee_id:   params.id,
      type,
      incident_date: incident_date ?? null,
      issued_date,
      description:   description.trim(),
      action_taken:  action_taken?.trim() ?? null,
      follow_up_date: follow_up_date ?? null,
      issued_by:     session.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Optional email notification
  if (notify_email) {
    const empName = `${emp.first_name} ${emp.last_name}`;
    await notifyWarningIssued({
      company_id:    session.companyId,
      to_email:      notify_email,
      employee_name: empName,
      warning_type:  TYPE_LABELS[type] ?? type,
      issued_date,
      record_id:     data.id,
      employee_id:   params.id,
    });
  }

  return NextResponse.json(data, { status: 201 });
}
