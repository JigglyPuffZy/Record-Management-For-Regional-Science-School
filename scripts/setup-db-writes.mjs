/**
 * One-time setup: apply anon write grants via service role (bypasses RLS).
 * Usage: node scripts/setup-db-writes.mjs
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
  console.error('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const statements = [
  `GRANT INSERT, UPDATE ON students TO anon`,
  `GRANT INSERT, UPDATE ON grade_records TO anon`,
  `DROP POLICY IF EXISTS students_anon_insert ON students`,
  `CREATE POLICY students_anon_insert ON students FOR INSERT TO anon WITH CHECK (true)`,
  `DROP POLICY IF EXISTS grade_records_anon_insert ON grade_records`,
  `CREATE POLICY grade_records_anon_insert ON grade_records FOR INSERT TO anon WITH CHECK (true)`,
  `DROP POLICY IF EXISTS grade_records_anon_update ON grade_records`,
  `CREATE POLICY grade_records_anon_update ON grade_records FOR UPDATE TO anon USING (true) WITH CHECK (true)`,
];

for (const sql of statements) {
  const { error } = await admin.rpc('exec', { sql });
  if (error && error.code !== 'PGRST202') {
    console.log(`Note: ${sql.slice(0, 50)}... → ${error.message}`);
  }
}

// Test anon write path
const anon = createClient(url, env.VITE_SUPABASE_ANON_KEY);
const probeId = `2026-TEST-${Date.now()}`;

const { error: insErr } = await anon.from('students').insert({
  student_id: probeId,
  lrn: `999${Date.now()}`.slice(0, 12),
  last_name: 'Probe',
  first_name: 'Test',
  middle_name: '',
  name_extension: '',
  display_name: 'Test Probe',
  sex: 'Male',
  birthdate: '2010-01-01',
  class_id: 'G10-RIZAL',
  status: 'Active',
  demo_password: 'test123',
});

if (insErr) {
  console.log('\nAnon write test FAILED:', insErr.message);
  console.log('Run supabase/app_rpcs.sql in Supabase Dashboard → SQL Editor');
  process.exit(1);
}

await admin.from('students').delete().eq('student_id', probeId);
console.log('OK: Database writes enabled for the app');
