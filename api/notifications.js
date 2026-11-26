import { database, check, HttpError, postOnly, respondError, requireAccount } from './_lib/access.js';
import { getGradingPeriodsForGradeLevel } from '../src/data/curriculum.js';

const time = value => Date.parse(value) || 0;
const latest = values => values.filter(Boolean).sort((a, b) => time(b) - time(a))[0] || '';
function optional(result) {
  if (['42P01', 'PGRST205'].includes(result.error?.code)) return null;
  check(result.error); return result.data;
}

async function studentNotifications(db, account) {
  const results = await Promise.all([
    db.from('grade_records').select('id, class_id, subject_id, school_year_id, quarter1, quarter2, quarter3, quarter4, updated_by, updated_at')
      .eq('student_id', account.linked_id).order('updated_at', { ascending: false }).limit(50),
    db.from('subjects').select('id, name'),
    db.from('student_eligibility').select('updated_at').eq('student_id', account.linked_id).maybeSingle(),
    db.from('academic_record_audit').select('id, created_at').eq('student_id', account.linked_id)
      .in('action', ['sf10-details', 'correct-history', 'prior-record', 'advance']).order('created_at', { ascending: false }).limit(1),
  ]);
  results.slice(0, 2).forEach(result => check(result.error));
  const eligibility = optional(results[2]);
  const audit = optional(results[3]);
  const notifications = results[0].data.filter(row => row.updated_at && (row.updated_by || ['quarter1', 'quarter2', 'quarter3', 'quarter4'].some(field => row[field] != null))).map(row => ({
    id: `grade:${row.id || `${row.class_id}:${row.subject_id}:${row.school_year_id}`}`,
    version: row.updated_at, createdAt: row.updated_at,
    title: `${results[1].data.find(subject => subject.id === row.subject_id)?.name || row.subject_id} record updated`,
    description: `School year ${row.school_year_id} · View your academic record`,
    href: `/student/academic-records?schoolYear=${encodeURIComponent(row.school_year_id)}&subjectId=${encodeURIComponent(row.subject_id)}`,
  }));
  const updated = latest([eligibility?.updated_at, audit?.[0]?.created_at]);
  if (updated) notifications.push({ id: 'sf10-details', version: updated, createdAt: updated, title: 'Your SF10 was updated', description: 'View your latest learner information and permanent academic record.', href: '/student/sf10' });
  return notifications;
}

async function teacherNotifications(db, account) {
  const years = await db.from('school_years').select('id').eq('is_active', true);
  check(years.error);
  const assignments = await db.from('teaching_assignments').select('class_id, subject_id, school_year_id, created_at')
    .eq('teacher_id', account.linked_id).in('school_year_id', years.data.map(year => year.id));
  check(assignments.error);
  const classIds = [...new Set(assignments.data.map(item => item.class_id))];
  const results = await Promise.all([
    db.from('students').select('student_id, class_id, created_at').in('class_id', classIds).eq('status', 'Active'),
    db.from('classes').select('id, grade_level, section').in('id', classIds),
    db.from('subjects').select('id, name'),
    db.from('app_accounts').select('id, name, status, created_at, reviewed_at').eq('role', 'student')
      .eq('details->>submittedBy', account.id).order('created_at', { ascending: false }).limit(25),
  ]);
  results.forEach(result => check(result.error));
  const notifications = await Promise.all(assignments.data.map(async assignment => {
    const roster = results[0].data.filter(student => student.class_id === assignment.class_id);
    if (!roster.length) return null;
    const cls = results[1].data.find(item => item.id === assignment.class_id);
    if (!cls) return null;
    const records = await db.from('grade_records').select('student_id, quarter1, quarter2, quarter3, quarter4, updated_at')
      .eq('class_id', assignment.class_id).eq('subject_id', assignment.subject_id).eq('school_year_id', assignment.school_year_id)
      .in('student_id', roster.map(student => student.student_id));
    check(records.error);
    const periods = getGradingPeriodsForGradeLevel(cls.grade_level);
    const incomplete = roster.filter(student => {
      const row = records.data.find(record => record.student_id === student.student_id);
      return !row || periods.some(period => row[period.field] == null);
    }).length;
    if (!incomplete) return null;
    const updated = latest([assignment.created_at, ...roster.map(student => student.created_at), ...records.data.map(row => row.updated_at)]);
    const subject = results[2].data.find(item => item.id === assignment.subject_id)?.name || assignment.subject_id;
    return { id: `grading:${assignment.class_id}:${assignment.subject_id}`, version: `${updated}:${incomplete}:${roster.length}`, createdAt: updated,
      title: `${subject} · ${cls.grade_level} - ${cls.section}`,
      description: `${incomplete} learner${incomplete === 1 ? '' : 's'} with incomplete term grades. Open your class record to continue.`,
      href: `/teacher/class-record?classId=${encodeURIComponent(assignment.class_id)}&subjectId=${encodeURIComponent(assignment.subject_id)}`,
    };
  }));
  for (const registration of results[3].data) {
    const status = { pending: 'awaiting admin verification', approved: 'approved', rejected: 'declined' }[registration.status];
    if (!status) continue;
    const updated = registration.reviewed_at || registration.created_at || '';
    notifications.push({ id: `registration:${registration.id}`, version: `${registration.status}:${updated}`, createdAt: updated,
      title: `${registration.name}: registration ${status}`,
      description: 'Student account submitted by you. Contact the administrator for verification questions.', href: '/teacher/students',
    });
  }
  return notifications.filter(Boolean);
}

export function createHandler(getDatabase = database) {
  return async (req, res) => {
    try {
      postOnly(req, res);
      const db = getDatabase();
      const account = await requireAccount(req, db, ['teacher', 'student']);
      if (!account.linked_id) throw new HttpError(403, 'Your school profile is not linked to this account.');
      const items = account.role === 'student' ? await studentNotifications(db, account) : await teacherNotifications(db, account);
      const notifications = items.sort((a, b) => time(b.createdAt) - time(a.createdAt) || a.id.localeCompare(b.id)).slice(0, 50);
      return res.status(200).json({ notifications, total: notifications.length });
    } catch (err) { respondError(res, err); }
  };
}
export default createHandler();
