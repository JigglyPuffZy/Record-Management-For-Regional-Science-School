/**
 * Apply app RPCs to Supabase via the SQL API (service role).
 * Usage: node scripts/apply-app-rpcs.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const text = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('FAIL: Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sql = readFileSync(new URL('../supabase/app_rpcs.sql', import.meta.url), 'utf8');

const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  const body = await res.text();
  if (body.includes('exec_sql') || res.status === 404) {
    console.log('Auto-apply not available via API.');
    console.log('Please paste supabase/app_rpcs.sql into Supabase Dashboard → SQL Editor → Run.');
    console.log('URL:', url.replace('.supabase.co', '.supabase.co/project/_/sql'));
    process.exit(1);
  }
  console.error('FAIL:', res.status, body);
  process.exit(1);
}

console.log('OK: app_rpcs.sql applied');

const supabase = createClient(url, serviceKey);
const { error } = await supabase.rpc('login_teacher', { p_id_or_email: 'T-ADMIN', p_password: 'Bpans@2026' });
console.log(error ? `WARN: ${error.message}` : 'OK: login_teacher still works');
