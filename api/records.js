import { database, check, postOnly, respondError, requireAccount } from './_lib/access.js';

export function createHandler(getDatabase = database) {
  return async function handler(req, res) {
    try {
      postOnly(req, res);
      const db = getDatabase();
      const account = await requireAccount(req, db, ['teacher', 'student']);
      let assignmentsQuery = db.from('teaching_assignments').select('teacher_id, class_id, subject_id');
      if (account.role === 'teacher') assignmentsQuery = assignmentsQuery.eq('teacher_id', account.linked_id);
      let studentQuery = db.from('students').select('student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status');
      if (account.role === 'student') studentQuery = studentQuery.eq('student_id', account.linked_id);
      const assignments = await assignmentsQuery;
      check(assignments.error);
      if (account.role === 'teacher') studentQuery = studentQuery.in('class_id', [...new Set(assignments.data.map(a => a.class_id))]);
      const students = await studentQuery;
      check(students.error);
      const studentIds = students.data.map(s => s.student_id);
      const grades = await db.from('grade_records').select('*').in('student_id', studentIds);
      check(grades.error);
      const classIds = [...new Set(students.data.map(s => s.class_id).concat(grades.data.map(g => g.class_id), assignments.data.filter(a => a.teacher_id === account.linked_id).map(a => a.class_id)))];
      const results = await Promise.all([
        db.from('academic_year_records').select('*').in('student_id', studentIds),
        db.from('classes').select('*').in('id', classIds),
        db.from('teaching_assignments').select('teacher_id, class_id, subject_id').in('class_id', classIds),
        db.from('school_years').select('id, label, is_active, sort_order').order('sort_order'),
        db.from('student_eligibility').select('*').in('student_id', studentIds),
      ]);
      results.slice(0, 4).forEach(result => check(result.error));
      const eligibilityMissing = ['42P01', 'PGRST205'].includes(results[4].error?.code);
      if (!eligibilityMissing) check(results[4].error);
      const archiveIds = results[0].data.map(row => row.id);
      const history = await Promise.all([
        db.from('academic_year_subject_grades').select('*').in('academic_year_record_id', archiveIds),
        db.from('remedial_classes').select('*').in('academic_year_record_id', archiveIds),
      ]);
      history.forEach(result => check(result.error));
      const teacherIds = [...new Set(results[2].data.map(a => a.teacher_id).concat(results[1].data.map(c => c.adviser_teacher_id).filter(Boolean), account.role === 'teacher' ? [account.linked_id] : []))];
      const teachers = await db.from('teachers').select('teacher_id, name, email, position').in('teacher_id', teacherIds);
      check(teachers.error);
      // Teachers can view SF10s of their enrolled learners; grade writes remain subject-specific.
      return res.status(200).json({ students: students.data, grades: grades.data, classes: results[1].data, teachers: teachers.data, assignments: results[2].data,
        archives: results[0].data, archivedGrades: history[0].data, remedials: history[1].data,
        schoolYears: results[3].data, eligibility: results[4].data || [], workflowsReady: !eligibilityMissing });
    } catch (err) { respondError(res, err); }
  };
}
export default createHandler();
