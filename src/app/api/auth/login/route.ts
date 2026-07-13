import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/session';

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Hash format: salt:hexdigest
  const [salt, digest] = hash.split(':');
  if (!salt || !digest) return false;
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === digest;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, company_id, name, email, role, property_ids, password_hash, active')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: 'Account is inactive. Contact your administrator.' }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Set session
    const session = await getSession();
    session.userId = user.id;
    session.companyId = user.company_id;
    session.role = user.role;
    session.propertyIds = user.property_ids ?? [];
    session.email = user.email;
    session.name = user.name;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
