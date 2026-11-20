// Read-only check for the account approval schema and anonymous access restrictions.
import { createClient } from '@supabase/supabase-js';
for (const file of ['.env', '.env.local']) { try { process.loadEnvFile(file); } catch {} }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !serviceKey || !anonKey) throw new Error('Set Supabase URL, service role key, and public key in the local environment.');
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
let failed = false;
for (const table of ['app_accounts', 'classes', 'teachers', 'students', 'grade_records']) {
  const { error, count } = await db.from(table).select('*', { count: 'exact', head: true });
  console.log(error ? `FAIL ${table}: ${error.code || 'connection failure'}` : `OK ${table}: ${count} rows`);
  if (error) failed = true;
}
for (const table of ['app_accounts', 'students', 'teachers', 'grade_records']) {
  const { error } = await anon.from(table).select('*', { head: true }).limit(1);
  const denied = error?.code === '42501';
  console.log(denied ? `OK anonymous access denied: ${table}` : `FAIL verify anonymous grants: ${table}`);
  if (!denied) failed = true;
}
process.exitCode = failed ? 1 : 0;
