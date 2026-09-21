import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

function mapStudentRow(row) {
  return {
    studentId: row.student_id,
    lrn: row.lrn,
    lastName: row.last_name,
    firstName: row.first_name,
    middleName: row.middle_name ?? '',
    nameExtension: row.name_extension ?? '',
    name: row.display_name,
    sex: row.sex,
    birthdate: row.birthdate,
    classId: row.class_id,
    password: row.demo_password,
    status: row.status,
  };
}

function mapGradeRow(row) {
  return {
    studentId: row.student_id,
    classId: row.class_id,
    subjectId: row.subject_id,
    schoolYear: row.school_year_id,
    gradeLevel: row.grade_level,
    quarter1: row.quarter1 != null ? Number(row.quarter1) : null,
    quarter2: row.quarter2 != null ? Number(row.quarter2) : null,
    quarter3: row.quarter3 != null ? Number(row.quarter3) : null,
    quarter4: row.quarter4 != null ? Number(row.quarter4) : null,
    finalGrade: row.final_grade != null ? Number(row.final_grade) : null,
  };
}

function buildDisplayName({ lastName, firstName, middleName, nameExtension }) {
  const ext = nameExtension ? ` ${nameExtension}` : '';
  return `${firstName} ${middleName ? `${middleName} ` : ''}${lastName}${ext}`.replace(/\s+/g, ' ').trim();
}

// Write RPCs (supabase/app_rpcs.sql) are optional — API routes are the primary path.
let rpcReady = false;

async function hasRpcs() {
  return rpcReady;
}

export async function fetchStudentsFromDb() {
  const { data, error } = await supabase.from('students').select('*').order('display_name');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapStudentRow);
}

export async function fetchGradesFromDb() {
  const { data, error } = await supabase.from('grade_records').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapGradeRow);
}

export async function hydrateAllFromDb() {
  if (!isSupabaseConfigured()) return { students: [], grades: [] };
  const [students, grades] = await Promise.all([fetchStudentsFromDb(), fetchGradesFromDb()]);
  return { students, grades };
}

async function nextStudentId() {
  const { data, error } = await supabase.from('students').select('student_id').like('student_id', '2026-%');
  if (error) throw new Error(error.message);
  const max = (data ?? []).reduce((m, row) => {
    const n = Number(String(row.student_id).split('-')[1]);
    return n > m ? n : m;
  }, 0);
  return `2026-${String(max + 1).padStart(3, '0')}`;
}

async function createStudentDirect({
  lrn,
  lastName,
  firstName,
  middleName,
  nameExtension,
  birthdate,
  sex,
  classId,
  password,
}) {
  const { data: cls, error: clsErr } = await supabase
    .from('classes')
    .select('grade_level, school_year_id')
    .eq('id', classId)
    .single();
  if (clsErr || !cls) throw new Error('Class not found.');

  const studentId = await nextStudentId();
  const displayName = buildDisplayName({ lastName, firstName, middleName, nameExtension });

  const { data: student, error: insErr } = await supabase
    .from('students')
    .insert({
      student_id: studentId,
      lrn: String(lrn).trim(),
      last_name: lastName.trim(),
      first_name: firstName.trim(),
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
    if (insErr.message?.includes('duplicate') || insErr.code === '23505') {
      throw new Error('An account with this LRN already exists.');
    }
    throw new Error(insErr.message);
  }

  const { data: assignments, error: taErr } = await supabase
    .from('teaching_assignments')
    .select('subject_id')
    .eq('class_id', classId)
    .eq('school_year_id', cls.school_year_id);

  if (taErr) throw new Error(taErr.message);

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
    if (grErr) throw new Error(grErr.message);
  }

  return mapStudentRow(student);
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Server request failed');
  return json;
}

export async function createStudentInDb(payload) {
  try {
    return await apiPost('/api/create-student', payload);
  } catch (apiErr) {
    if (await hasRpcs()) {
      const { data, error } = await supabase.rpc('create_student_account', {
        p_lrn: payload.lrn,
        p_last_name: payload.lastName,
        p_first_name: payload.firstName,
        p_middle_name: payload.middleName ?? '',
        p_name_extension: payload.nameExtension ?? '',
        p_birthdate: payload.birthdate,
        p_sex: payload.sex,
        p_class_id: payload.classId,
        p_password: payload.password,
      });
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error('Could not create student account.');
      return mapStudentRow(data[0]);
    }
    try {
      return await createStudentDirect(payload);
    } catch {
      throw apiErr;
    }
  }
}

async function saveGradeDirect({
  studentId,
  classId,
  subjectId,
  schoolYear,
  field,
  value,
  updatedBy,
}) {
  const { data: cls, error: clsErr } = await supabase
    .from('classes')
    .select('grade_level')
    .eq('id', classId)
    .single();
  if (clsErr || !cls) throw new Error('Class not found.');

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

  if (error) throw new Error(error.message);
  return mapGradeRow(data);
}

export async function saveGradeInDb(payload) {
  try {
    const row = await apiPost('/api/save-grade', payload);
    return {
      studentId: row.studentId,
      classId: row.classId,
      subjectId: row.subjectId,
      schoolYear: row.schoolYear,
      gradeLevel: row.gradeLevel,
      quarter1: row.quarter1,
      quarter2: row.quarter2,
      quarter3: row.quarter3,
      quarter4: row.quarter4,
      finalGrade: row.finalGrade,
    };
  } catch (apiErr) {
    if (await hasRpcs()) {
      const { data, error } = await supabase.rpc('save_grade_record', {
        p_student_id: payload.studentId,
        p_class_id: payload.classId,
        p_subject_id: payload.subjectId,
        p_school_year_id: payload.schoolYear,
        p_field: payload.field,
        p_value: payload.value,
        p_updated_by: payload.updatedBy ?? null,
      });
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error('Grade record not found after save.');
      return mapGradeRow(data[0]);
    }
    try {
      return await saveGradeDirect(payload);
    } catch {
      throw apiErr;
    }
  }
}
