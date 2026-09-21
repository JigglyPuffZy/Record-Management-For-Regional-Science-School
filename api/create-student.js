import { createClient } from '@supabase/supabase-js';

function buildDisplayName({ lastName, firstName, middleName, nameExtension }) {
  const ext = nameExtension ? ` ${nameExtension}` : '';
  return `${firstName} ${middleName ? `${middleName} ` : ''}${lastName}${ext}`.replace(/\s+/g, ' ').trim();
}

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

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const body = req.body ?? {};

  const {
    lrn, lastName, firstName, middleName, nameExtension, birthdate, sex, classId, password,
  } = body;

  if (!lrn || !lastName || !firstName || !classId || !password) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const { data: cls, error: clsErr } = await supabase
    .from('classes')
    .select('grade_level, school_year_id')
    .eq('id', classId)
    .single();

  if (clsErr || !cls) {
    res.status(400).json({ error: 'Class not found' });
    return;
  }

  const { data: existing } = await supabase.from('students').select('student_id').eq('lrn', String(lrn).trim());
  if (existing?.length) {
    res.status(400).json({ error: 'An account with this LRN already exists.' });
    return;
  }

  const { data: idRows } = await supabase.from('students').select('student_id').like('student_id', '2026-%');
  const max = (idRows ?? []).reduce((m, row) => {
    const n = Number(String(row.student_id).split('-')[1]);
    return n > m ? n : m;
  }, 0);
  const studentId = `2026-${String(max + 1).padStart(3, '0')}`;
  const displayName = buildDisplayName({ lastName, firstName, middleName, nameExtension });

  const { data: student, error: insErr } = await supabase
    .from('students')
    .insert({
      student_id: studentId,
      lrn: String(lrn).trim(),
      last_name: String(lastName).trim(),
      first_name: String(firstName).trim(),
      middle_name: (middleName ?? '').trim(),
      name_extension: (nameExtension ?? '').trim(),
      display_name: displayName,
      sex,
      birthdate,
      class_id: classId,
      status: 'Active',
      demo_password: password,
    })
    .select()
    .single();

  if (insErr) {
    res.status(400).json({ error: insErr.message });
    return;
  }

  const { data: assignments } = await supabase
    .from('teaching_assignments')
    .select('subject_id')
    .eq('class_id', classId)
    .eq('school_year_id', cls.school_year_id);

  if (assignments?.length) {
    const gradeRows = assignments.map((a) => ({
      student_id: studentId,
      class_id: classId,
      subject_id: a.subject_id,
      school_year_id: cls.school_year_id,
      grade_level: cls.grade_level,
      status: 'draft',
    }));
    const { error: grErr } = await supabase.from('grade_records').insert(gradeRows);
    if (grErr) {
      res.status(400).json({ error: grErr.message });
      return;
    }
  }

  res.status(200).json({
    studentId: student.student_id,
    lrn: student.lrn,
    lastName: student.last_name,
    firstName: student.first_name,
    middleName: student.middle_name ?? '',
    nameExtension: student.name_extension ?? '',
    name: student.display_name,
    sex: student.sex,
    birthdate: student.birthdate,
    classId: student.class_id,
    password: student.demo_password,
    status: student.status,
  });
}
