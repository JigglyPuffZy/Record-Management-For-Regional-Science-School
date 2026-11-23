import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';

const setup = await readFile(new URL('../supabase/account_approvals.sql', import.meta.url), 'utf8');
async function emptySupabase() {
  const db = new PGlite({ extensions: { citext } });
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
  `);
  return db;
}

test('standalone SQL fixes missing base tables, enforces approval, and preserves data on rerun', async () => {
  const db = await emptySupabase();
  try {
    await db.exec(setup);
    const admin = (await db.query("SELECT * FROM app_accounts WHERE identifier = 't-admin'")).rows[0];
    assert.equal(admin.role, 'admin');
    assert.equal(admin.status, 'approved');
    const initial = (await db.query('SELECT * FROM pg_temp.sf10_setup_credentials')).rows[0];
    assert.match(initial.temporary_password, /^[a-f0-9]{32}$/);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM subjects')).rows[0].n, 12);

    // Execute the real approval function, rather than mocking the transaction.
    const teacherId = '11111111-1111-4111-8111-111111111111';
    const studentId = '22222222-2222-4222-8222-222222222222';
    const rejectedId = '33333333-3333-4333-8333-333333333333';
    await db.query(`INSERT INTO app_accounts (id, role, identifier, email, name, password_hash, details)
      VALUES ($1, 'teacher', 't-test', 'teacher@example.test', 'Test Teacher', 'hash', '{"position":"Teacher I"}')`, [teacherId]);
    await db.query("SELECT review_registration($1, $2, 'approved', 'Verified employment', 'G10-RIZAL', ARRAY['MATH'])", [admin.id, teacherId]);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM teaching_assignments WHERE teacher_id = 'T-TEST'")).rows[0].n, 1);
    await assert.rejects(db.query("SELECT review_registration($1, $2, 'approved', 'Repeated', 'G10-RIZAL', ARRAY['MATH'])", [admin.id, teacherId]), /no longer pending/);

    const details = { firstName: 'Test', lastName: 'Learner', sex: 'Female', birthdate: '2011-02-03', registrationSource: 'teacher', submittedBy: teacherId };
    await db.query(`INSERT INTO app_accounts (id, role, identifier, email, name, password_hash, details)
      VALUES ($1, 'student', '123456789012', 'learner@example.test', 'Test Learner', 'hash', $2)`, [studentId, JSON.stringify(details)]);
    await assert.rejects(db.query("SELECT review_registration($1, $2, 'approved', 'Not an admin', 'G10-RIZAL', '{}')", [teacherId, studentId]), /Administrator access required/);
    await db.query("SELECT review_registration($1, $2, 'approved', 'Enrollment verified', 'G10-RIZAL', '{}')", [admin.id, studentId]);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM grade_records WHERE student_id = 'S-123456789012'")).rows[0].n, 12);
    await db.exec("UPDATE grade_records SET quarter1 = 90, quarter2 = 93, quarter3 = 96 WHERE student_id = 'S-123456789012' AND subject_id = 'MATH'");
    assert.equal((await db.query("SELECT final_grade FROM grade_records WHERE subject_id = 'MATH'")).rows[0].final_grade, 93);

    await db.query(`INSERT INTO app_accounts (id, role, identifier, email, name, details)
      VALUES ($1, 'student', '123456789013', 'declined@example.test', 'Declined Learner', $2)`, [rejectedId, JSON.stringify(details)]);
    await db.query("SELECT review_registration($1, $2, 'rejected', 'Enrollment not verified', NULL, '{}')", [admin.id, rejectedId]);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM students WHERE lrn = '123456789013'")).rows[0].n, 0);
    assert.equal((await db.query('SELECT status FROM app_accounts WHERE id = $1', [rejectedId])).rows[0].status, 'rejected');

    await db.exec("UPDATE subjects SET name = 'School Mathematics' WHERE id = 'MATH'");
    await db.exec(setup);
    assert.equal((await db.query('SELECT * FROM pg_temp.sf10_setup_credentials')).rows.length, 0);
    assert.equal((await db.query("SELECT demo_password FROM teachers WHERE teacher_id = 'T-ADMIN'")).rows[0].demo_password, initial.temporary_password);
    assert.equal((await db.query("SELECT final_grade FROM grade_records WHERE subject_id = 'MATH'")).rows[0].final_grade, 93);
    assert.equal((await db.query("SELECT name FROM subjects WHERE id = 'MATH'")).rows[0].name, 'School Mathematics');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM app_accounts')).rows[0].n, 4);

    const privileges = (await db.query(`SELECT
      has_table_privilege('anon', 'public.teachers', 'SELECT') AS anon_read,
      has_table_privilege('authenticated', 'public.app_accounts', 'INSERT') AS client_write,
      has_function_privilege('anon', 'public.review_registration(uuid,uuid,text,text,text,text[])', 'EXECUTE') AS anon_approve,
      has_function_privilege('service_role', 'public.review_registration(uuid,uuid,text,text,text,text[])', 'EXECUTE') AS server_approve`)).rows[0];
    assert.deepEqual(privileges, { anon_read: false, client_write: false, anon_approve: false, server_approve: true });
  } finally { await db.close(); }
});

test('SQL detects a teachers table in another schema instead of silently creating duplicates', async () => {
  const db = await emptySupabase();
  try {
    await db.exec('CREATE SCHEMA school; CREATE TABLE school.teachers (id text)');
    await assert.rejects(db.exec(setup), /another schema/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT to_regclass('public.teachers') AS relation")).rows[0].relation, null);
  } finally { await db.close(); }
});

test('partial setup preserves existing teachers and bootstraps a missing administrator', async () => {
  const db = await emptySupabase();
  try {
    await db.exec(`CREATE EXTENSION citext;
      CREATE TABLE public.teachers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), teacher_id text UNIQUE NOT NULL,
        auth_user_id uuid UNIQUE REFERENCES auth.users(id), name text NOT NULL,
        email citext UNIQUE NOT NULL, position text NOT NULL, demo_password text,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO public.teachers (teacher_id, name, email, position, demo_password)
      VALUES ('T-EXISTING', 'Existing Teacher', 'existing@example.test', 'Teacher I', 'existing-password');`);
    await db.exec(setup);
    const teacher = (await db.query("SELECT * FROM public.teachers WHERE teacher_id = 'T-EXISTING'")).rows[0];
    assert.equal(teacher.name, 'Existing Teacher');
    assert.equal(teacher.demo_password, 'existing-password');
    assert.equal((await db.query("SELECT role FROM app_accounts WHERE identifier = 't-existing'")).rows[0].role, 'teacher');
    assert.equal((await db.query("SELECT count(*)::int AS n FROM app_accounts WHERE role = 'admin' AND status = 'approved'")).rows[0].n, 1);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM pg_temp.sf10_setup_credentials')).rows[0].n, 1);
  } finally { await db.close(); }
});
