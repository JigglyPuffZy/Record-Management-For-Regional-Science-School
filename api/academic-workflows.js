import { database, check, HttpError, postOnly, respondError, requireAccount } from './_lib/access.js';
import { validateWorkflow } from './_lib/academic-workflows.js';

export function createHandler(getDatabase = database) {
  return async (req, res) => {
    try {
      postOnly(req, res);
      const db = getDatabase();
      const account = await requireAccount(req, db, ['admin', 'teacher']);
      const { action, ...input } = req.body || {};
      if (action === 'options') {
        if (account.role !== 'admin') throw new HttpError(403, 'Administrator access is required.');
        const results = await Promise.all([
          db.from('school_years').select('*').order('sort_order'),
          db.from('classes').select('*').order('school_year_id'),
          db.from('subjects').select('id, name').eq('is_active', true).order('sort_order'),
          db.from('app_accounts').select('linked_id, name').eq('role', 'teacher').eq('status', 'approved'),
          db.from('students').select('student_id, display_name, lrn, class_id, status').eq('status', 'Active'),
          db.from('teaching_assignments').select('teacher_id, class_id, subject_id'),
        ]);
        results.forEach(result => check(result.error));
        return res.status(200).json(Object.fromEntries(['years', 'classes', 'subjects', 'teachers', 'students', 'assignments'].map((key, index) => [key, results[index].data])));
      }
      if (account.role === 'teacher' && !['eligibility', 'correct-history', 'prior-record'].includes(action)) throw new HttpError(403, 'Administrator access is required.');
      if (account.role === 'admin' && ['eligibility', 'correct-history', 'prior-record'].includes(action)) throw new HttpError(403, 'Teachers manage academic record corrections.');
      const data = validateWorkflow(action, input);
      const result = await db.rpc('sf10_workflow', { p_actor: account.id, p_action: action, p_data: data });
      if (result.error?.code === 'PGRST202') throw new HttpError(503, 'Academic workflow setup is required. Ask the administrator to install the SF10 workflow migration.');
      check(result.error);
      return res.status(200).json({ ok: true, result: result.data });
    } catch (err) { respondError(res, err); }
  };
}
export default createHandler();
