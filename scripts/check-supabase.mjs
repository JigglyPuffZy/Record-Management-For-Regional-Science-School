/**
 * Quick Supabase connectivity + seed data check.
 * Usage: node scripts/check-supabase.mjs
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
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('FAIL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

const checks = [
  { label: 'schools', table: 'schools', select: 'school_id, name' },
  { label: 'school_years', table: 'school_years', select: 'id, is_active' },
  { label: 'students', table: 'students', select: 'student_id', head: true },
  { label: 'teachers', table: 'teachers', select: 'teacher_id', head: true },
  { label: 'grade_records', table: 'grade_records', select: 'id', head: true },
  { label: 'classes', table: 'classes', select: 'id, grade_level' },
];

console.log('Supabase URL:', url);
console.log('---');

let failed = false;

for (const c of checks) {
  const q = supabase.from(c.table).select(c.select, c.head ? { count: 'exact', head: true } : undefined);
  const { data, error, count } = await q;
  if (error) {
    console.log(`FAIL  ${c.label}: ${error.message}`);
    failed = true;
  } else if (c.head) {
    console.log(`OK    ${c.label}: ${count} rows`);
  } else {
    console.log(`OK    ${c.label}: ${data.length} rows`);
    if (c.label === 'schools' && data[0]) console.log(`      → ${data[0].name}`);
    if (c.label === 'school_years') {
      const active = data.find((r) => r.is_active);
      console.log(`      → active SY: ${active?.id ?? 'none'}`);
    }
  }
}

// RPC login smoke test — teacher admin account
const studentCount = (await supabase.from('students').select('*', { count: 'exact', head: true })).count ?? 0;
if (studentCount === 0) {
  console.log('OK    login_student RPC: skipped (no students — run Create Student in app)');
} else {
  console.log(`INFO  students in DB: ${studentCount} (student login not auto-tested)`);
}

const { data: teacherLogin, error: teacherErr } = await supabase.rpc('login_teacher', {
  p_id_or_email: 'T-ADMIN',
  p_password: 'Bpans@2026',
});
if (teacherErr) {
  console.log(`FAIL  login_teacher RPC: ${teacherErr.message}`);
  failed = true;
} else if (!teacherLogin?.length) {
  console.log('FAIL  login_teacher RPC: no match (check seed data)');
  failed = true;
} else {
  console.log(`OK    login_teacher RPC: ${teacherLogin[0].display_name}`);
}

console.log('---');
console.log(failed ? 'Database check: SOME TESTS FAILED' : 'Database check: ALL OK');
process.exit(failed ? 1 : 0);
