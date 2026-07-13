import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await requireSession();

  let query = supabase
    .from('documents')
    .select(`
      id, employee_id, title, generated_at, created_at,
      employees(id, first_name, last_name, property_id, properties(name, state))
    `)
    .eq('company_id', session.companyId)
    .eq('type', 'offer_letter')
    .order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by property access for non-admins
  const filtered = (data ?? []).filter(doc => {
    const emp = doc.employees as unknown as { property_id: string } | null;
    if (!emp) return false;
    if (isAdmin(session.role)) return true;
    return (session.propertyIds ?? []).includes(emp.property_id);
  });

  return NextResponse.json(filtered);
}
