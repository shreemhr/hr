import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePortalSession } from '@/lib/portal-session';

export async function GET() {
  const session = await requirePortalSession();

  const { data } = await supabase
    .from('performance_reviews')
    .select('id, review_period, review_date, rating, overall_comments, goals_next_period, employee_comments, status, users(name)')
    .eq('company_id', session.companyId)
    .eq('employee_id', session.employeeId)
    .eq('status', 'completed')  // Only show completed reviews to employee
    .order('review_date', { ascending: false });

  return NextResponse.json(data ?? []);
}
