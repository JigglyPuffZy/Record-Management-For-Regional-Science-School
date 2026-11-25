import { database, check, HttpError, postOnly, respondError, requireAccount } from './_lib/access.js';

export function createHandler(getDatabase = database) {
  return async function handler(req, res) {
    try {
      postOnly(req, res);
      const db = getDatabase();
      const admin = await requireAccount(req, db, ['admin']);
      const body = req.body || {};
      if (body.action === 'list') {
        const results = await Promise.all([
          db.from('app_accounts').select('id, role, identifier, name, email, status, details, linked_id, created_at, reviewed_at, review_note, reviewed_by').order('created_at', { ascending: false }),
          db.from('classes').select('id, grade_level, section, school_year_id'),
          db.from('subjects').select('id, name').eq('is_active', true).order('sort_order'),
          db.from('teaching_assignments').select('teacher_id, class_id, subject_id, school_year_id'),
        ]);
        results.forEach(result => check(result.error));
        return res.status(200).json({ accounts: results[0].data, classes: results[1].data, subjects: results[2].data, assignments: results[3].data });
      }
      if (body.action === 'delete') {
        if (!body.accountId || body.accountId === admin.id) throw new HttpError(400, 'Choose an account to delete.');
        const { data: target, error: targetError } = await db.from('app_accounts').select('role').eq('id', body.accountId).maybeSingle();
        check(targetError);
        if (!target) throw new HttpError(404, 'Account not found.');
        if (target.role === 'admin') throw new HttpError(400, 'Administrator accounts cannot be deleted.');
        const { error } = await db.from('app_accounts').delete().eq('id', body.accountId);
        check(error);
        return res.status(200).json({ ok: true });
      }
      if (body.action !== 'review' || !['approved', 'rejected'].includes(body.decision)) throw new HttpError(400, 'Choose an approval decision.');
      if (!body.accountId || body.accountId === admin.id) throw new HttpError(400, 'Choose a pending registration.');
      const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1500) : '';
      if (!note) throw new HttpError(400, 'Record how you verified this person, or the reason for declining.');
      const { error } = await db.rpc('review_registration', {
        p_admin: admin.id, p_account: body.accountId, p_decision: body.decision,
        p_note: note, p_class_id: body.classId || null,
        p_subject_ids: Array.isArray(body.subjectIds) ? [...new Set(body.subjectIds)] : [],
      });
      check(error);
      return res.status(200).json({ ok: true });
    } catch (err) { respondError(res, err); }
  };
}
export default createHandler();
