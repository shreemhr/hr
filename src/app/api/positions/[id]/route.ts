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
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined)      patch.title      = String(body.title).trim();
  if (body.department !== undefined) patch.department = body.department?.trim() || null;
  if (body.pay_type !== undefined)   patch.pay_type   = body.pay_type;
  if (body.pay_rate !== undefined)   patch.pay_rate   = body.pay_rate ?? null;
  if (body.active !== undefined)     patch.active     = !!body.active;
  if (body.headcount_target !== undefined) {
    patch.headcount_target =
      body.headcount_target === '' || body.headcount_target == null
        ? null
        : Number(body.headcount_target);
  }
  if (body.property_ids !== undefined) {
    patch.property_ids = Array.isArray(body.property_ids) ? body.property_ids : [];
  }
  // Pay band — corporate control (admin-only, already enforced above)
  if (body.pay_band_min !== undefined) {
    patch.pay_band_min = body.pay_band_min === '' || body.pay_band_min == null ? null : Number(body.pay_band_min);
  }
  if (body.pay_band_max !== undefined) {
    patch.pay_band_max = body.pay_band_max === '' || body.pay_band_max == null ? null : Number(body.pay_band_max);
  }
  if (body.pay_band_mode !== undefined && (body.pay_band_mode === 'hard' || body.pay_band_mode === 'soft')) {
    patch.pay_band_mode = body.pay_band_mode;
  }

  // Guard: band values must be non-negative, and min must not exceed max when both present
  const newMin = 'pay_band_min' in patch ? (patch.pay_band_min as number | null) : undefined;
  const newMax = 'pay_band_max' in patch ? (patch.pay_band_max as number | null) : undefined;
  if (newMin != null && newMin < 0) {
    return NextResponse.json({ error: 'Band minimum cannot be negative.' }, { status: 400 });
  }
  if (newMax != null && newMax < 0) {
    return NextResponse.json({ error: 'Band maximum cannot be negative.' }, { status: 400 });
  }
  if (newMin != null && newMax != null && newMin > newMax) {
    return NextResponse.json({ error: 'Band minimum cannot be greater than maximum.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('positions')
    .update(patch)
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'Position not found' }, { status: 404 });

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

  const { error } = await supabase
    .from('positions')
    .delete()
    .eq('id', params.id)
    .eq('company_id', session.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
