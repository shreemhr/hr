import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin, canManageProperty } from '@/lib/auth';

export async function GET() {
  const session = await requireSession();

  let query = supabase
    .from('properties')
    .select('*')
    .eq('company_id', session.companyId)
    .order('name');

  // Non-admins only see their assigned properties
  if (!isAdmin(session.role) && session.propertyIds?.length) {
    query = query.in('id', session.propertyIds);
  } else if (!isAdmin(session.role)) {
    return NextResponse.json([]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();

  if (!isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, address, city, state, zip, brand } = body;

  if (!name || !state) {
    return NextResponse.json({ error: 'Name and state are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('properties')
    .insert({
      company_id: session.companyId,
      name: name.trim(),
      address: address?.trim() ?? null,
      city: city?.trim() ?? null,
      state: state.toUpperCase(),
      zip: zip?.trim() ?? null,
      brand: brand?.trim() ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
