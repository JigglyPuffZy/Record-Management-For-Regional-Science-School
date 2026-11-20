import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
for (const file of ['.env', '.env.local']) { try { process.loadEnvFile(file); } catch {} }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set Supabase URL and service role key before applying account setup.');
const db = createClient(url, key, { auth: { persistSession: false } });
const query = readFileSync(new URL('../supabase/account_approvals.sql', import.meta.url), 'utf8');
const { error } = await db.rpc('exec_sql', { query });
if (error) {
  console.error('Automatic SQL setup unavailable. Run supabase/account_approvals.sql in the Supabase SQL Editor.');
  console.error('Database error code:', error.code);
  process.exitCode = 1;
} else console.log('Account approval migration applied. Existing administrator now uses the Admin sign-in tab.');
