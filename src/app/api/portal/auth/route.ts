import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPortalSession } from '@/lib/portal-session';

async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const [salt, digest] = hash.split(':');
  if (!salt || !digest) return false;
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const computed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === digest;
}

export async function POST(req: NextRequest) {
  const { token, pin } = await req.json();

  if (!token || !pin) {
    return NextResponse.json({ error: 'Token and PIN required' }, { status: 400 });
  }

  const { data: invite } = await supabase
    .from('portal_invites')
    .select('id, employee_id, company_id, pin_hash, expires_at')
    .eq('token', token)
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite link.' }, { status: 401 });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite link has expired. Contact your HR team.' }, { status: 401 });
  }

  const valid = await verifyPin(pin, invite.pin_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
  }

  // Fetch employee name
  const { data: emp } = await supabase
    .from('employees')
    .select('first_name, last_name')
    .eq('id', invite.employee_id)
    .single();

  // Update last login
  await supabase
    .from('portal_invites')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', invite.id);

  // Set portal session
  const session = await getPortalSession();
  session.employeeId   = invite.employee_id;
  session.companyId    = invite.company_id;
  session.employeeName = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee';
  await session.save();

  return NextResponse.json({ ok: true });
}
