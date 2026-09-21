import { createClient } from '@supabase/supabase-js';

const ALLOWED_FIELDS = new Set(['quarter1', 'quarter2', 'quarter3', 'quarter4']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(500).json({ error: 'Server database configuration missing' });
    return;
  }

  const {
    studentId, classId, subjectId, schoolYear, field, value, updatedBy,
  } = req.body ?? {};

  if (!studentId || !classId || !subjectId || !schoolYear || !field) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  if (!ALLOWED_FIELDS.has(field)) {
    res.status(400).json({ error: 'Invalid grading period' });
    return;
  }
  if (value != null && (value < 0 || value > 100)) {
    res.status(400).json({ error: 'Invalid grade. Please enter a value from 0 to 100.' });
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: cls, error: clsErr } = await supabase
    .from('classes')
    .select('grade_level')
    .eq('id', classId)
    .single();

  if (clsErr || !cls) {
    res.status(400).json({ error: 'Class not found' });
    return;
  }

  const patch = {
    student_id: studentId,
    class_id: classId,
    subject_id: subjectId,
    school_year_id: schoolYear,
    grade_level: cls.grade_level,
    updated_by: updatedBy ?? null,
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
}
