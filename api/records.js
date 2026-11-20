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
      const classIds = [...new Set(students.data.map(s => s.class_id).concat(assignments.data.filter(a => a.teacher_id === account.linked_id).map(a => a.class_id)))];
      const results = await Promise.all([
        db.from('grade_records').select('*').in('student_id', students.data.map(s => s.student_id)),
        db.from('classes').select('*').in('id', classIds),
        db.from('teaching_assignments').select('teacher_id, class_id, subject_id').in('class_id', classIds),
      ]);
      results.forEach(result => check(result.error));
      const teacherIds = [...new Set(results[2].data.map(a => a.teacher_id).concat(results[1].data.map(c => c.adviser_teacher_id).filter(Boolean), account.role === 'teacher' ? [account.linked_id] : []))];
      const teachers = await db.from('teachers').select('teacher_id, name, email, position').in('teacher_id', teacherIds);
      check(teachers.error);
      // Teachers can view SF10s of their enrolled learners; grade writes remain subject-specific.
      return res.status(200).json({ students: students.data, grades: results[0].data, classes: results[1].data, teachers: teachers.data, assignments: results[2].data });
    } catch (err) { respondError(res, err); }
  };
}
export default createHandler();
