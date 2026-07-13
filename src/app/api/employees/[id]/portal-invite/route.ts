import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, canManageProperty } from '@/lib/auth';

async function hashPin(pin: string): Promise<string> {
  const salt = crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const digest = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${salt}:${digest}`;
}

function generatePin(): string {
  // 6-digit numeric PIN
  return String(Math.floor(100000 + Math.random() * 900000));
}

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

  const { data: invite } = await supabase
    .from('portal_invites')
    .select('id, token, created_at, last_login_at, expires_at')
    .eq('employee_id', params.id)
    .eq('company_id', session.companyId)
    .maybeSingle();

  return NextResponse.json({ invite: invite ?? null });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();

  const { data: emp } = await supabase
    .from('employees')
    .select('property_id, first_name, last_name')
    .eq('id', params.id)
    .eq('company_id', session.companyId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canManageProperty(session, emp.property_id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Delete any existing invite for this employee
  await supabase
    .from('portal_invites')
    .delete()
    .eq('employee_id', params.id)
    .eq('company_id', session.companyId);

  const pin     = generatePin();
  const pinHash = await hashPin(pin);
  const token   = crypto.randomUUID().replace(/-/g, '');

  const { data: invite, error } = await supabase
    .from('portal_invites')
    .insert({
      company_id:  session.companyId,
      employee_id: params.id,
      token,
      pin_hash:    pinHash,
      created_by:  session.userId,
      expires_at:  null, // no expiry by default
    })
    .select('id, token, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return PIN in plaintext ONCE — it's not stored recoverable after this
  return NextResponse.json({ token: invite.token, pin, created_at: invite.created_at });
}
