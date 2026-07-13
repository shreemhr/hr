import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePortalSession } from '@/lib/portal-session';

export async function GET() {
  const session = await requirePortalSession();

  const { data: tasks } = await supabase
    .from('onboarding_tasks')
    .select('id, form_id, form_name, short_name, description, link, federal, status, collected_at, notes')
    .eq('company_id', session.companyId)
    .eq('employee_id', session.employeeId)
    .order('created_at');

  return NextResponse.json({ tasks: tasks ?? [] });
}
