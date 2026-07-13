import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireSession, isAdmin } from '@/lib/auth';

export async function GET() {
  const session = await requireSession();

  if (!isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, property_ids, active, created_at')
    .eq('company_id', session.companyId)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();

  if (!isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role, property_ids } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'name, email, password, role required' }, { status: 400 });
  }

  // Check email unique
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  // Hash password
  const encoder = new TextEncoder();
  const salt = crypto.randomUUID();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const passwordHash = salt + ':' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      company_id: session.companyId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      role,
      property_ids: property_ids ?? [],
      active: true,
    })
    .select('id, name, email, role, property_ids, active, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(user, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession();

  if (!isAdmin(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Verify user belongs to this company
  const { data: target } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', id)
    .eq('company_id', session.companyId)
    .single();

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Don't allow demoting the only owner
  if (target.role === 'owner' && updates.role && updates.role !== 'owner') {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', session.companyId)
      .eq('role', 'owner');
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 });
    }
  }

  const allowed = ['name', 'role', 'property_ids', 'active'];
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) clean[key] = updates[key];
  }

  const { data, error } = await supabase
    .from('users')
    .update(clean)
    .eq('id', id)
    .eq('company_id', session.companyId)
    .select('id, name, email, role, property_ids, active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
