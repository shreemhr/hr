import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { TRIAL_DAYS } from '@/lib/product';

export async function POST(req: NextRequest) {
  try {
    const { companyName, name, email, password } = await req.json();

    if (!companyName || !name || !email || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    // Check email not already used
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Create company
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);

    const { data: company, error: compErr } = await supabase
      .from('companies')
      .insert({
        name: companyName.trim(),
        trial_ends_at: trialEnds.toISOString(),
        plan: 'trial',
      })
      .select()
      .single();

    if (compErr || !company) {
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
    }

    // Hash password using Web Crypto (bcrypt not available in Edge; use sha256 w/ salt for demo)
    // Production: swap with bcryptjs in Node runtime
    const encoder = new TextEncoder();
    const salt = crypto.randomUUID();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = salt + ':' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create owner user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({
        company_id: company.id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        role: 'owner',
        property_ids: [],
        active: true,
      })
      .select()
      .single();

    if (userErr || !user) {
      // Rollback company
      await supabase.from('companies').delete().eq('id', company.id);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Set session
    const session = await getSession();
    session.userId = user.id;
    session.companyId = company.id;
    session.role = 'owner';
    session.propertyIds = [];
    session.email = user.email;
    session.name = user.name;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('signup error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
