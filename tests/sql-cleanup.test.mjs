import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';

test('accidental setup cleanup preserves the original project tables, rows, and shared helpers', async () => {
  const db = new PGlite({ extensions: { citext } });
  const originalTables = ['classroom_members', 'classrooms', 'duel_rooms', 'learning_state', 'profiles'];
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);');
    for (const name of originalTables) await db.exec(`CREATE TABLE public.${name}(id int PRIMARY KEY, updated_at timestamptz); INSERT INTO public.${name}(id) VALUES (42);`);
    await db.exec(await readFile(new URL('../supabase/account_approvals.sql', import.meta.url), 'utf8'));
    // The existing app also uses this helper and enum; neither may be removed.
    await db.exec(`CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); ALTER TABLE public.profiles ADD COLUMN role public.user_role;`);
    const cleanup = await readFile(new URL('../supabase/remove_accidental_school_setup.sql', import.meta.url), 'utf8');
    await db.exec(cleanup);
    assert.deepEqual((await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")).rows.map(row => row.tablename), originalTables.sort());
    for (const name of originalTables) assert.equal((await db.query(`SELECT id FROM public.${name}`)).rows[0].id, 42);
    await db.exec('UPDATE public.profiles SET id = 42 WHERE id = 42;');
    assert.ok((await db.query('SELECT updated_at FROM public.profiles')).rows[0].updated_at);
    await db.exec(cleanup);
    assert.equal((await db.query('SELECT id FROM public.profiles')).rows[0].id, 42);
  } finally { await db.close(); }
});

test('an unexpected dependency stops cleanup and leaves all school records intact', async () => {
  const db = new PGlite({ extensions: { citext } });
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);');
    await db.exec(await readFile(new URL('../supabase/account_approvals.sql', import.meta.url), 'utf8'));
    await db.exec('CREATE TABLE public.original_feature(teacher_id text REFERENCES public.teachers(teacher_id));');
    await assert.rejects(db.exec(await readFile(new URL('../supabase/remove_accidental_school_setup.sql', import.meta.url), 'utf8')), /depend/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query('SELECT teacher_id FROM public.teachers')).rows[0].teacher_id, 'T-ADMIN');
    assert.ok((await db.query("SELECT to_regclass('public.original_feature') AS relation")).rows[0].relation);
  } finally { await db.close(); }
});
