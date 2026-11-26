import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, signSession, readSessionToken, validateRegistration } from '../api/_lib/access.js';
import { createHandler as access } from '../api/access.js';
import { createHandler as admin } from '../api/admin.js';
import { createHandler as records } from '../api/records.js';
import { createHandler as grades } from '../api/save-grade.js';
import { createHandler as workflows } from '../api/academic-workflows.js';

process.env.APP_SESSION_SECRET = 'local-test-secret-never-used-in-production';
const password = 'SchoolTest!2468';
const account = (role, status = 'approved') => ({ id: role, role, status, linked_id: role === 'student' ? 'S-1' : 'T-1', identifier: `${role}-id`, email: `${role}@example.test`, name: role, password_hash: hashPassword(password), details: {} });
// In-memory PostgREST adapter: tests execute the real HTTP handlers without touching Supabase.
function database(tables = {}, rpcResult = { error: null }) {
  const calls = [];
  return { tables, calls,
    rpc: async (name, args) => { calls.push({ name, args }); return rpcResult; },
    from(table) {
      const filters = [];
      let payload, operation = 'select', projection = '*', single = false, maxRows, sort, includeCount = false;
      const query = {
        select(columns = '*', options = {}) { projection = columns; includeCount = !!options.count; return this; },
        eq(key, value) { filters.push(row => key.includes('.') ? true : row[key] === value); return this; },
        in(key, values) { filters.push(row => values.includes(row[key])); return this; },
        order(key, options = {}) { sort = { key, ascending: options.ascending !== false }; return this; },
        limit(value) { maxRows = value; return this; },
        insert(value) { payload = value; operation = 'insert'; return this; },
        update(value) { payload = value; operation = 'update'; return this; },
        upsert(value) { payload = value; operation = 'upsert'; return this; },
        delete() { operation = 'delete'; return this; },
        single() { single = true; return this; },
        maybeSingle() { single = true; return this; },
        then(resolve, reject) {
          try {
            calls.push({ table, operation, payload });
            tables[table] ||= [];
            let rows = tables[table].filter(row => filters.every(fn => fn(row)));
            if (operation === 'insert') {
              if (tables[table].some(row => row.identifier === payload.identifier || row.email === payload.email)) return Promise.resolve({ error: { code: '23505' } }).then(resolve, reject);
              tables[table].push({ id: 'new-id', ...payload }); rows = [tables[table].at(-1)];
            }
            if (operation === 'update') rows.forEach(row => Object.assign(row, payload));
            if (operation === 'delete') tables[table] = tables[table].filter(row => !rows.includes(row));
            if (operation === 'upsert') { tables[table].push(payload); rows = [payload]; }
            const count = includeCount ? rows.length : null;
            if (sort) rows.sort((a, b) => String(a[sort.key]).localeCompare(String(b[sort.key])) * (sort.ascending ? 1 : -1));
            if (maxRows != null) rows = rows.slice(0, maxRows);
            const projected = projection === '*' ? rows : rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => projection.split(',').map(x => x.trim()).includes(key))));
            return Promise.resolve({ data: single ? projected[0] || null : projected, count, error: null }).then(resolve, reject);
          } catch (err) { return Promise.reject(err).then(resolve, reject); }
        },
      };
      return query;
    },
  };
}
async function request(factory, db, body = {}, who, options = {}) {
  const req = { method: 'POST', headers: { host: 'localhost', ...(who ? { cookie: `sf10_access=${signSession(who)}` } : {}) }, body, ...options };
  const res = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; } };
  await factory(() => db)(req, res);
  return res;
}
const registration = { role: 'student', firstName: 'Test', lastName: 'Learner', email: 'learner@example.test', lrn: '123456789012', password, birthdate: '2011-02-03', sex: 'Female', classId: 'CLASS-A', verification: 'Registrar can check my enrollment.' };

test('passwords are salted, and wrong passwords fail', () => {
  const first = hashPassword(password), second = hashPassword(password);
  assert.notEqual(first, second); assert.ok(verifyPassword(password, first)); assert.equal(verifyPassword('incorrect', first), false);
});
test('forged, tampered, malformed, and expired sessions are rejected', () => {
  const token = signSession('admin', 1000);
  assert.equal(readSessionToken(token, 1001).id, 'admin');
  assert.equal(readSessionToken(token, 1000 + 28800000), null);
  assert.equal(readSessionToken(`${token}x`, 1001), null);
  assert.equal(readSessionToken('admin'), null);
});
test('registration rejects admin escalation, invalid LRN, and missing identity evidence', () => {
  for (const patch of [{ role: 'admin' }, { lrn: '123' }, { verification: '' }, { password: 'short' }, { birthdate: '2011-02-31' }, { role: 'teacher', teacherId: 'T-ADMIN' }]) assert.throws(() => validateRegistration({ ...registration, ...patch }));
});
test('registration stores a pending hashed account without creating an enrolled learner', async () => {
  const db = database({ classes: [{ id: 'CLASS-A' }] });
  const result = await request(access, db, { action: 'register', ...registration, status: 'approved', linked_id: 'admin' });
  assert.equal(result.statusCode, 201);
  assert.equal(db.tables.app_accounts[0].status, 'pending');
  assert.equal(db.tables.app_accounts[0].linked_id, undefined);
  assert.ok(verifyPassword(password, db.tables.app_accounts[0].password_hash));
  assert.equal(db.tables.students, undefined);
  assert.equal(result.headers['Set-Cookie'], undefined);
  assert.equal((await request(access, db, { action: 'register', ...registration })).statusCode, 409);
});
test('pending/rejected accounts cannot log in; approved accounts get HttpOnly sessions', async () => {
  for (const status of ['pending', 'rejected', 'approved']) {
    const db = database({ app_accounts: [account('teacher', status)] });
    const result = await request(access, db, { action: 'login', role: 'teacher', id: 'teacher-id', password });
    assert.equal(result.statusCode, status === 'approved' ? 200 : 403);
    if (status === 'approved') assert.match(result.headers['Set-Cookie'], /HttpOnly; SameSite=Lax/);
    else assert.equal(result.headers['Set-Cookie'], undefined);
  }
});
test('teacher-created student accounts remain pending and record the submitting teacher', async () => {
  const db = database({ app_accounts: [account('teacher')], classes: [{ id: 'CLASS-A' }], teaching_assignments: [{ teacher_id: 'T-1', class_id: 'CLASS-A' }] });
  const result = await request(access, db, { ...registration, action: 'teacher-register-student', role: 'admin', status: 'approved', details: { submittedBy: 'forged' } }, 'teacher');
  assert.equal(result.statusCode, 201);
  const created = db.tables.app_accounts.find(row => row.identifier === registration.lrn);
  assert.equal(created.role, 'student'); assert.equal(created.status, 'pending');
  assert.equal(created.details.submittedBy, 'teacher');
  assert.equal(created.details.submittedByName, 'teacher');
  assert.equal(created.details.registrationSource, 'teacher');
  assert.equal(db.tables.students, undefined);
});
test('teacher enrollment requires an approved teacher and an assigned section', async () => {
  for (const role of [null, 'student', 'admin', 'teacher']) {
    const db = database({ app_accounts: role ? [account(role)] : [], classes: [{ id: 'CLASS-A' }], teaching_assignments: [] });
    const result = await request(access, db, { ...registration, action: 'teacher-register-student' }, role);
    assert.equal(result.statusCode, role ? 403 : 401);
    assert.equal(db.calls.some(call => call.table === 'app_accounts' && call.operation === 'insert'), false);
  }
});
test('teacher section options exclude unassigned classes', async () => {
  const db = database({ app_accounts: [account('teacher')], classes: [{ id: 'CLASS-A' }, { id: 'CLASS-B' }], teaching_assignments: [{ teacher_id: 'T-1', class_id: 'CLASS-A' }] });
  const result = await request(access, db, { action: 'teacher-options' }, 'teacher');
  assert.deepEqual(result.body.classes.map(row => row.id), ['CLASS-A']);
});
test('self-registration cannot forge teacher attribution', async () => {
  const db = database({ classes: [{ id: 'CLASS-A' }] });
  const result = await request(access, db, { ...registration, action: 'register', submittedBy: 'teacher', details: { registrationSource: 'teacher' } });
  assert.equal(result.statusCode, 201);
  assert.equal(db.tables.app_accounts[0].details.registrationSource, 'self');
  assert.equal(db.tables.app_accounts[0].details.submittedBy, undefined);
});
test('administrator must use Admin login; login does not leak password hashes', async () => {
  const db = database({ app_accounts: [account('admin')] });
  assert.equal((await request(access, db, { action: 'login', role: 'teacher', id: 'admin-id', password })).statusCode, 401);
  const result = await request(access, db, { action: 'login', role: 'admin', id: 'admin-id', password });
  assert.equal(result.body.user.role, 'admin'); assert.equal(result.body.user.password_hash, undefined);
});
test('legacy admin password is upgraded to a hash and removed from the teacher profile', async () => {
  const legacy = { ...account('admin'), password_hash: null };
  const db = database({ app_accounts: [legacy], teachers: [{ teacher_id: 'T-1', demo_password: password }] });
  const result = await request(access, db, { action: 'login', role: 'admin', id: 'admin-id', password });
  assert.equal(result.statusCode, 200);
  assert.ok(verifyPassword(password, legacy.password_hash)); assert.equal(db.tables.teachers[0].demo_password, null);
});
test('anonymous callers and teachers cannot review registrations', async () => {
  const db = database({ app_accounts: [account('teacher')] });
  assert.equal((await request(admin, db, { action: 'list' })).statusCode, 401);
  assert.equal((await request(admin, db, { action: 'list' }, 'teacher')).statusCode, 403);
  assert.equal(db.calls.some(call => call.name === 'review_registration'), false);
});
test('admin review requires a verification note and uses the server account identity', async () => {
  const db = database({ app_accounts: [account('admin')] });
  const body = { action: 'review', accountId: 'pending-1', decision: 'approved', classId: 'CLASS-A', subjectIds: ['MATH', 'MATH'] };
  assert.equal((await request(admin, db, body, 'admin')).statusCode, 400);
  assert.equal((await request(admin, db, { ...body, note: 'Verified by personnel office', adminId: 'forged' }, 'admin')).statusCode, 200);
  assert.deepEqual(db.calls.find(call => call.name === 'review_registration').args, { p_admin: 'admin', p_account: 'pending-1', p_decision: 'approved', p_note: 'Verified by personnel office', p_class_id: 'CLASS-A', p_subject_ids: ['MATH'] });
});
test('an account that loses approval cannot reuse an existing signed session', async () => {
  const db = database({ app_accounts: [account('teacher', 'rejected')] });
  assert.equal((await request(records, db, {}, 'teacher')).statusCode, 403);
});
test('student records exclude other learners and password fields', async () => {
  const db = database({ app_accounts: [account('student')], students: [{ student_id: 'S-1', class_id: 'CLASS-A', demo_password: 'secret' }, { student_id: 'S-2', class_id: 'CLASS-B' }], grade_records: [{ student_id: 'S-1' }, { student_id: 'S-2' }] });
  const result = await request(records, db, {}, 'student');
  assert.equal(result.statusCode, 200); assert.equal(result.body.students.length, 1); assert.equal(result.body.grades.length, 1); assert.equal(result.body.students[0].demo_password, undefined);
});
const gradePayload = { studentId: 'S-1', classId: 'CLASS-A', subjectId: 'MATH', schoolYear: '2026-2027', field: 'quarter1', value: 90, updatedBy: 'forged-admin' };
function gradeDb(role = 'teacher') { return database({ app_accounts: [account(role)], teaching_assignments: [{ id: 'a', teacher_id: 'T-1', class_id: 'CLASS-A', subject_id: 'MATH', school_year_id: '2026-2027' }], students: [{ student_id: 'S-1', class_id: 'CLASS-A', status: 'Active' }], school_years: [{ id: '2026-2027', is_active: true }], classes: [{ id: 'CLASS-A', grade_level: 'Grade 10' }] }); }
test('students and administrators cannot write grades', async () => {
  for (const role of ['student', 'admin']) assert.equal((await request(grades, gradeDb(role), gradePayload, role)).statusCode, 403);
});
test('teacher grade writes enforce assignment, enrollment, active year, and valid numeric grades', async () => {
  for (const patch of [{ subjectId: 'SCI' }, { studentId: 'S-2' }, { value: '90' }, { value: NaN }, { value: 101 }, { field: 'quarter4' }, { value: undefined }]) {
    const db = gradeDb(); const result = await request(grades, db, { ...gradePayload, ...patch }, 'teacher');
    assert.ok([400, 403].includes(result.statusCode)); assert.equal(db.tables.grade_records, undefined);
  }
  const archived = gradeDb(); archived.tables.school_years[0].is_active = false;
  assert.equal((await request(grades, archived, gradePayload, 'teacher')).statusCode, 403);
  const db = gradeDb(); assert.equal((await request(grades, db, gradePayload, 'teacher')).statusCode, 200);
  assert.equal(db.tables.grade_records[0].updated_by, 'T-1');
});
test('cross-origin mutation requests are rejected before database access', async () => {
  const result = await request(admin, database(), {}, null, { headers: { host: 'school.example', origin: 'https://attacker.example' } });
  assert.equal(result.statusCode, 403);
});

test('academic workflows deny student writes and teacher administrative actions before invoking SQL', async () => {
  for (const [role, action] of [['student', 'eligibility'], ['teacher', 'advance'], ['teacher', 'assignment'], ['teacher', 'options'], ['admin', 'correct-history']]) {
    const db = database({ app_accounts: [account(role)] });
    assert.equal((await request(workflows, db, { action, reason: 'verified' }, role)).statusCode, 403);
    assert.equal(db.calls.some(call => call.name === 'sf10_workflow'), false);
  }
});

test('academic workflow identity comes from the signed session and missing migration has a specific message', async () => {
  const body = { action: 'eligibility', studentId: 'S1', details: { eligible: true }, reason: 'Verified Grade 6 record', actorId: 'forged' };
  const db = database({ app_accounts: [account('teacher')] });
  assert.equal((await request(workflows, db, body, 'teacher')).statusCode, 200);
  const call = db.calls.find(item => item.name === 'sf10_workflow');
  assert.equal(call.args.p_actor, 'teacher'); assert.equal(call.args.p_data.actorId, undefined);
  const missing = database({ app_accounts: [account('teacher')] }, { error: { code: 'PGRST202' } });
  const result = await request(workflows, missing, body, 'teacher');
  assert.equal(result.statusCode, 503); assert.match(result.body.error, /SF10 workflow migration/);
});

test('history access stays scoped to the signed-in learner including archived grades and remedials', async () => {
  const db = database({ app_accounts: [account('student')],
    students: [{ student_id: 'S-1', class_id: 'C10' }, { student_id: 'S-2', class_id: 'OTHER' }],
    grade_records: [{ student_id: 'S-1', class_id: 'C7' }, { student_id: 'S-2', class_id: 'OTHER' }],
    classes: [{ id: 'C7' }, { id: 'C10' }, { id: 'OTHER' }],
    academic_year_records: [{ id: 'Y1', student_id: 'S-1' }, { id: 'Y2', student_id: 'S-2' }],
    academic_year_subject_grades: [{ academic_year_record_id: 'Y1' }, { academic_year_record_id: 'Y2' }],
    remedial_classes: [{ academic_year_record_id: 'Y1' }, { academic_year_record_id: 'Y2' }],
    student_eligibility: [{ student_id: 'S-1' }, { student_id: 'S-2' }],
  });
  const { body } = await request(records, db, {}, 'student');
  assert.equal(body.archives.length, 1); assert.equal(body.archivedGrades.length, 1);
  assert.equal(body.remedials.length, 1); assert.equal(body.eligibility.length, 1);
  assert.deepEqual(body.classes.map(cls => cls.id).sort(), ['C10', 'C7']);
});

test('only administrators can delete teacher/student login accounts while preserving academic records', async () => {
  const db = database({ app_accounts: [account('admin'), account('teacher'), account('student')], students: [{ student_id: 'S-1' }], grade_records: [{ student_id: 'S-1', quarter1: 90 }] });
  assert.equal((await request(admin, db, { action: 'delete', accountId: 'student' }, 'teacher')).statusCode, 403);
  assert.equal((await request(admin, db, { action: 'delete', accountId: 'admin' }, 'admin')).statusCode, 400);
  assert.equal((await request(admin, db, { action: 'delete', accountId: 'unknown' }, 'admin')).statusCode, 404);
  assert.equal((await request(admin, db, { action: 'delete', accountId: 'student' }, 'admin')).statusCode, 200);
  assert.equal(db.tables.app_accounts.some(row => row.id === 'student'), false);
  assert.equal(db.tables.students.length, 1); assert.equal(db.tables.grade_records[0].quarter1, 90);
  assert.equal((await request(records, db, {}, 'student')).statusCode, 403);
});

test('notification feed is admin-only and excludes approved, rejected, and admin registrations', async () => {
  const db = database({ app_accounts: [account('admin'), account('teacher'), account('student'),
    { ...account('teacher', 'pending'), id: 'pending-teacher' },
    { ...account('student', 'rejected'), id: 'rejected-student' },
    { ...account('admin', 'pending'), id: 'pending-admin' },
  ] });
  for (const role of [null, 'teacher', 'student']) {
    assert.equal((await request(admin, db, { action: 'notifications' }, role)).statusCode, role ? 403 : 401);
  }
  const result = await request(admin, db, { action: 'notifications' }, 'admin');
  assert.equal(result.statusCode, 200); assert.equal(result.body.total, 1);
  assert.deepEqual(Object.keys(result.body.notifications[0]).sort(), ['id', 'name', 'role']);
  assert.equal(result.body.notifications[0].id, 'pending-teacher');
  db.tables.app_accounts.find(row => row.id === 'pending-teacher').status = 'approved';
  assert.deepEqual((await request(admin, db, { action: 'notifications' }, 'admin')).body, { notifications: [], total: 0 });
});

test('notification badge counts every pending registration while feed returns the newest eight without private fields', async () => {
  const pending = Array.from({ length: 12 }, (_, index) => ({ ...account(index % 2 ? 'teacher' : 'student', 'pending'), id: `pending-${index}`, created_at: `2026-11-${String(index + 1).padStart(2, '0')}T00:00:00Z` }));
  const db = database({ app_accounts: [account('admin'), ...pending] });
  const result = await request(admin, db, { action: 'notifications' }, 'admin');
  assert.equal(result.body.total, 12); assert.equal(result.body.notifications.length, 8);
  assert.equal(result.body.notifications[0].id, 'pending-11');
  assert.equal(result.body.notifications[7].id, 'pending-4');
  for (const item of result.body.notifications) assert.deepEqual(Object.keys(item).sort(), ['created_at', 'id', 'name', 'role']);
});
