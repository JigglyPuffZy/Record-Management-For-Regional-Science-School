import { database, check, HttpError, postOnly, respondError, requireAccount } from './_lib/access.js';

const ALLOWED_FIELDS = new Set(['quarter1', 'quarter2', 'quarter3', 'quarter4']);

export function createHandler(getDatabase = database) {
  return async function handler(req, res) {
    try {
      postOnly(req, res);
      const supabase = getDatabase();
      const account = await requireAccount(req, supabase, ['teacher']);
      const {
        studentId, classId, subjectId, schoolYear, field, value,
      } = req.body ?? {};

      if (!studentId || !classId || !subjectId || !schoolYear || !field || value === undefined) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      if (!ALLOWED_FIELDS.has(field)) {
        res.status(400).json({ error: 'Invalid grading period' });
        return;
      }
      if (value != null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)) {
        res.status(400).json({ error: 'Invalid grade. Please enter a value from 0 to 100.' });
        return;
      }

      const { data: assignment, error: assignmentError } = await supabase.from('teaching_assignments')
        .select('id').eq('teacher_id', account.linked_id).eq('class_id', classId)
        .eq('subject_id', subjectId).eq('school_year_id', schoolYear).maybeSingle();
      check(assignmentError);
      if (!assignment) throw new HttpError(403, 'You are not assigned to this class and subject.');
      const { data: learner, error: learnerError } = await supabase.from('students').select('student_id')
        .eq('student_id', studentId).eq('class_id', classId).eq('status', 'Active').maybeSingle();
      check(learnerError);
      if (!learner) throw new HttpError(400, 'Student is not enrolled in this class.');
      const { data: year, error: yearError } = await supabase.from('school_years').select('is_active').eq('id', schoolYear).single();
      check(yearError);
      if (!year.is_active) throw new HttpError(403, 'Archived school years cannot be edited.');

      const { data: cls, error: clsErr } = await supabase
        .from('classes')
        .select('grade_level')
        .eq('id', classId)
        .single();

      if (clsErr || !cls) {
        res.status(400).json({ error: 'Class not found' });
        return;
      }
      if (cls.grade_level === 'Grade 10' && field === 'quarter4') throw new HttpError(400, 'Grade 10 has three terms.');

      const patch = {
        student_id: studentId,
        class_id: classId,
        subject_id: subjectId,
        school_year_id: schoolYear,
        grade_level: cls.grade_level,
        updated_by: account.linked_id,
        [field]: value,
      };

      const { data, error } = await supabase
        .from('grade_records')
        .upsert(patch, { onConflict: 'student_id,class_id,subject_id,school_year_id' })
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(200).json({
        studentId: data.student_id,
        classId: data.class_id,
        subjectId: data.subject_id,
        schoolYear: data.school_year_id,
        gradeLevel: data.grade_level,
        quarter1: data.quarter1 != null ? Number(data.quarter1) : null,
        quarter2: data.quarter2 != null ? Number(data.quarter2) : null,
        quarter3: data.quarter3 != null ? Number(data.quarter3) : null,
        quarter4: data.quarter4 != null ? Number(data.quarter4) : null,
        finalGrade: data.final_grade != null ? Number(data.final_grade) : null,
      });
    } catch (err) { respondError(res, err); }
  };
}
export default createHandler();
