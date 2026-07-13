import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Temporary diagnostic endpoint — visit in a browser to see why Supabase calls are
// failing without needing DevTools. Remove once signup/login are confirmed working.
export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
  };

  let companiesTable: { ok: boolean; error: string | null; code: string | null } = {
    ok: false,
    error: null,
    code: null,
  };

  try {
    const { error } = await supabase.from('companies').select('id').limit(1);
    companiesTable = { ok: !error, error: error?.message ?? null, code: error?.code ?? null };
  } catch (err) {
    companiesTable = { ok: false, error: err instanceof Error ? err.message : String(err), code: 'exception' };
  }

  let usersTable: { ok: boolean; error: string | null; code: string | null } = {
    ok: false,
    error: null,
    code: null,
  };

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    usersTable = { ok: !error, error: error?.message ?? null, code: error?.code ?? null };
  } catch (err) {
    usersTable = { ok: false, error: err instanceof Error ? err.message : String(err), code: 'exception' };
  }

  return NextResponse.json({ env, companiesTable, usersTable });
}
