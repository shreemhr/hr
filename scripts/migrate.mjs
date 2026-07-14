#!/usr/bin/env node
// Runs pending Supabase migrations (supabase/migrations/*.sql) against the
// production database before the Next.js build, so schema changes ship
// automatically with each deploy instead of requiring a manual SQL Editor step.
//
// Requires SUPABASE_DB_URL (the direct Postgres connection string from
// Supabase dashboard -> Project Settings -> Database -> Connection string).
// If it's not set, migrations are skipped with a warning rather than failing
// the build — keeps local `npm run build` working without the secret.

import { spawnSync } from 'node:child_process';

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.warn('[migrate] SUPABASE_DB_URL not set — skipping database migrations.');
  process.exit(0);
}

console.log('[migrate] Applying pending Supabase migrations...');

const result = spawnSync(
  'npx',
  ['--yes', 'supabase', 'db', 'push', '--db-url', dbUrl, '--yes'],
  { stdio: 'inherit' }
);

if (result.status !== 0) {
  console.error('[migrate] Migration failed — aborting build.');
  process.exit(result.status ?? 1);
}

console.log('[migrate] Migrations applied successfully.');
