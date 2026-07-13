import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession();

  if (!isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, address, city, state, zip, brand, is_marriott, active } = body;

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (state !== undefined && !/^[A-Za-z]{2}$/.test(String(state).trim())) {
    return NextResponse.json({ error: 'State must be a 2-letter code' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined)        patch.name        = name.trim();
  if (address !== undefined)     patch.address     = address?.trim() ?? null;
  if (city !== undefined)        patch.city        = city?.trim() ?? null;
  if (state !== undefined)       patch.state       = String(state).trim().toUpperCase();
  if (zip !== undefined)         patch.zip         = zip?.trim() ?? null;
  if (brand !== undefined)       patch.brand       = brand?.trim() ?? null;
  if (is_marriott !== undefined) patch.is_marriott = !!is_marriott;
  if (active !== undefined)      patch.active      = !!active;

  const { data, error } = await supabase
    .from('properties')
    .update(patch)
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireSession();

  if (!isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { count: employeeCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', params.id)
    .eq('company_id', session.companyId);

  if (employeeCount && employeeCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${employeeCount} employee${employeeCount === 1 ? '' : 's'} still assigned to this property.` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', params.id)
    .eq('company_id', session.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
