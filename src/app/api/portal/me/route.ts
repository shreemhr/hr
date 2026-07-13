import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePortalSession } from '@/lib/portal-session';

export async function GET() {
  const session = await requirePortalSession();

  const { data: emp } = await supabase
    .from('employees')
    .select(`
      id, first_name, last_name, email, hire_date, onboarding_status,
      properties(name, state),
      positions(title)
    `)
    .eq('id', session.employeeId)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  const prop = emp.properties as unknown as { name: string; state: string } | null;
  const pos  = emp.positions  as unknown as { title: string } | null;

  return NextResponse.json({
    id:                emp.id,
    first_name:        emp.first_name,
    last_name:         emp.last_name,
    email:             emp.email,
    hire_date:         emp.hire_date,
    onboarding_status: emp.onboarding_status,
    property_name:     prop?.name ?? null,
    property_state:    prop?.state ?? null,
    position_title:    pos?.title ?? null,
  });
}
