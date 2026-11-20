import { database, check, HttpError, postOnly, respondError, requireAccount, publicSession, signSession, sessionCookie, verifyPassword, hashPassword, validateRegistration } from './_lib/access.js';

export function createHandler(getDatabase = database) {
  return async function handler(req, res) {
    try {
      postOnly(req, res);
      const body = req.body || {};
      if (body.action === 'logout') {
        res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
        return res.status(200).json({ ok: true });
      }
      const db = getDatabase();
      if (body.action === 'session') return res.status(200).json({ user: publicSession(await requireAccount(req, db)) });
      if (['options', 'teacher-options'].includes(body.action)) {
        let query = db.from('classes').select('id, grade_level, section, school_year_id, school_years!inner(is_active)').eq('school_years.is_active', true);
        if (body.action === 'teacher-options') {
          const teacher = await requireAccount(req, db, ['teacher']);
          const assignments = await db.from('teaching_assignments').select('class_id').eq('teacher_id', teacher.linked_id);
          check(assignments.error);
          query = query.in('id', [...new Set(assignments.data.map(row => row.class_id))]);
        }
        const { data, error } = await query;
        check(error);
        return res.status(200).json({ classes: data });
      }
      if (['register', 'teacher-register-student'].includes(body.action)) {
        const teacher = body.action === 'teacher-register-student' ? await requireAccount(req, db, ['teacher']) : null;
        const account = validateRegistration(teacher ? { ...body, role: 'student' } : body);
        account.details.registrationSource = teacher ? 'teacher' : 'self';
        if (teacher) {
          const assignments = await db.from('teaching_assignments').select('class_id').eq('teacher_id', teacher.linked_id).eq('class_id', account.details.classId);
          check(assignments.error);
          if (!assignments.data.length) throw new HttpError(403, 'You can create student accounts only for your assigned sections.');
          account.details.submittedBy = teacher.id;
          account.details.submittedByName = teacher.name;
        }
        const { data: cls, error: classError } = await db.from('classes').select('id, school_years!inner(is_active)').eq('id', account.details.classId).eq('school_years.is_active', true).maybeSingle();
        check(classError);
        if (!cls) throw new HttpError(400, 'Choose a section in the active school year.');
        const { error } = await db.from('app_accounts').insert(account);
        check(error);
        return res.status(201).json({ message: 'Registration submitted. The school administrator must verify and approve your account before you can sign in.' });
      }
      if (body.action !== 'login') throw new HttpError(400, 'Invalid action.');
      if (!['admin', 'teacher', 'student'].includes(body.role) || typeof body.id !== 'string' || typeof body.password !== 'string' || body.password.length > 128) throw new HttpError(400, 'Enter your login details.');
      const id = body.id.trim().toLowerCase();
      const byId = await db.from('app_accounts').select('*').eq('role', body.role).eq('identifier', id).maybeSingle();
      check(byId.error);
      const byEmail = byId.data ? byId : await db.from('app_accounts').select('*').eq('role', body.role).eq('email', id).maybeSingle();
      check(byEmail.error);
      const account = byEmail.data;
      let valid = account && verifyPassword(body.password, account.password_hash);
      // Existing accounts are upgraded to salted hashes on their first successful login.
      if (account && !account.password_hash && account.linked_id) {
        const table = account.role === 'student' ? 'students' : 'teachers';
        const column = account.role === 'student' ? 'student_id' : 'teacher_id';
        const { data: legacy, error: legacyError } = await db.from(table).select('demo_password').eq(column, account.linked_id).maybeSingle();
        check(legacyError);
        valid = typeof legacy?.demo_password === 'string' && legacy.demo_password === body.password;
        if (valid) {
          check((await db.from('app_accounts').update({ password_hash: hashPassword(body.password) }).eq('id', account.id)).error);
          check((await db.from(table).update({ demo_password: null }).eq(column, account.linked_id)).error);
        }
      }
      if (!valid) throw new HttpError(401, 'Invalid ID/email or password.');
      if (account.status === 'pending') throw new HttpError(403, 'Your registration is pending administrator verification. Please wait for approval.');
      if (account.status === 'rejected') throw new HttpError(403, 'Your registration was declined. Please contact the school administrator.');
      res.setHeader('Set-Cookie', sessionCookie(req, signSession(account.id)));
      return res.status(200).json({ user: publicSession(account) });
    } catch (err) { respondError(res, err); }
  };
}
export default createHandler();
