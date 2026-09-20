/**
 * Generates supabase/full_schema.sql — paste entire file into Supabase SQL Editor.
 */
import { writeFileSync } from 'fs';
import { SCHOOL, SCHOOL_YEARS, ACTIVE_SCHOOL_YEAR, GRADE_LEVELS } from '../src/data/schools.js';
import { SUBJECTS } from '../src/data/subjects.js';
import { CURRICULUM_BY_GRADE } from '../src/data/curriculum.js';
import { TEACHERS } from '../src/data/teachers.js';
import { CLASSES, TEACHING_ASSIGNMENTS } from '../src/data/classes.js';
import { INITIAL_STUDENTS } from '../src/data/students.js';
import { INITIAL_GRADES } from '../src/data/grades.js';
import { ACADEMIC_HISTORY } from '../src/data/academicHistory.js';

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function escNum(v) {
  if (v === null || v === undefined) return 'NULL';
  return String(v);
}

const lines = [];

lines.push(`-- =============================================================================
-- SF10 & Class Record Management System
-- Complete Supabase schema + seed data (single file)
--
-- Project: Bagong Pag-asa National High School
-- Active SY: ${ACTIVE_SCHOOL_YEAR}
--
-- HOW TO USE:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this ENTIRE file and click Run
--   3. Demo logins (until Supabase Auth is wired in the app):
--        Student: LRN 136045210001 / student123
--        Teacher: T-2001 or ramon.santos@depedqc.edu.ph / teacher123
--
-- WARNING: Includes demo_password columns for migration only.
--          Remove before production and use Supabase Auth instead.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. RESET (safe re-run in dev — drops app tables only)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS remedial_classes CASCADE;
DROP TABLE IF EXISTS academic_year_subject_grades CASCADE;
DROP TABLE IF EXISTS academic_year_records CASCADE;
DROP TABLE IF EXISTS grade_records CASCADE;
DROP TABLE IF EXISTS teaching_assignments CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS curriculum_periods CASCADE;
DROP TABLE IF EXISTS curriculum_configs CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS school_years CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS sex_type CASCADE;
DROP TYPE IF EXISTS student_status CASCADE;
DROP TYPE IF EXISTS grade_level_type CASCADE;
DROP TYPE IF EXISTS curriculum_scale CASCADE;
DROP TYPE IF EXISTS grade_record_status CASCADE;

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 2. ENUMS
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('student', 'teacher');
CREATE TYPE sex_type AS ENUM ('Male', 'Female');
CREATE TYPE student_status AS ENUM ('Active', 'Inactive', 'Transferred', 'Graduated');
CREATE TYPE grade_level_type AS ENUM ('Grade 7', 'Grade 8', 'Grade 9', 'Grade 10');
CREATE TYPE curriculum_scale AS ENUM ('jhs', 'grade10');
CREATE TYPE grade_record_status AS ENUM ('draft', 'finalized', 'archived');

-- -----------------------------------------------------------------------------
-- 3. TABLES
-- -----------------------------------------------------------------------------

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id text UNIQUE NOT NULL,
  name text NOT NULL,
  district text NOT NULL,
  address text NOT NULL,
  division text NOT NULL,
  region text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE school_years (
  id text PRIMARY KEY,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  sort_order smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subjects (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  sort_order smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE curriculum_configs (
  grade_level grade_level_type PRIMARY KEY,
  scale curriculum_scale NOT NULL,
  final_label text NOT NULL DEFAULT 'Final Rating',
  term_count smallint NOT NULL CHECK (term_count IN (3, 4)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE curriculum_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level grade_level_type NOT NULL REFERENCES curriculum_configs(grade_level) ON DELETE CASCADE,
  period_id text NOT NULL,
  label text NOT NULL,
  storage_field text NOT NULL,
  sort_order smallint NOT NULL,
  UNIQUE (grade_level, period_id),
  UNIQUE (grade_level, storage_field)
);

CREATE TABLE teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text UNIQUE NOT NULL,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email citext UNIQUE NOT NULL,
  position text NOT NULL,
  demo_password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE classes (
  id text PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  school_year_id text NOT NULL REFERENCES school_years(id) ON DELETE RESTRICT,
  grade_level grade_level_type NOT NULL,
  section text NOT NULL,
  adviser_teacher_id text REFERENCES teachers(teacher_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grade_level, section, school_year_id)
);

CREATE TABLE teaching_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  class_id text NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  school_year_id text NOT NULL REFERENCES school_years(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id, subject_id, school_year_id)
);

CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  lrn text UNIQUE NOT NULL,
  last_name text NOT NULL,
  first_name text NOT NULL,
  middle_name text NOT NULL DEFAULT '',
  name_extension text NOT NULL DEFAULT '',
  display_name text NOT NULL,
  sex sex_type NOT NULL,
  birthdate date NOT NULL,
  class_id text NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  status student_status NOT NULL DEFAULT 'Active',
  demo_password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE grade_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  class_id text NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  subject_id text NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  school_year_id text NOT NULL REFERENCES school_years(id) ON DELETE RESTRICT,
  grade_level grade_level_type NOT NULL,
  quarter1 numeric(5,1) CHECK (quarter1 IS NULL OR (quarter1 >= 0 AND quarter1 <= 100)),
  quarter2 numeric(5,1) CHECK (quarter2 IS NULL OR (quarter2 >= 0 AND quarter2 <= 100)),
  quarter3 numeric(5,1) CHECK (quarter3 IS NULL OR (quarter3 >= 0 AND quarter3 <= 100)),
  quarter4 numeric(5,1) CHECK (quarter4 IS NULL OR (quarter4 >= 0 AND quarter4 <= 100)),
  final_grade smallint,
  status grade_record_status NOT NULL DEFAULT 'draft',
  updated_by text REFERENCES teachers(teacher_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_id, subject_id, school_year_id)
);

CREATE TABLE academic_year_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  school_year_id text NOT NULL REFERENCES school_years(id) ON DELETE RESTRICT,
  grade_level grade_level_type NOT NULL,
  section text NOT NULL,
  adviser_name text NOT NULL,
  school_name text NOT NULL,
  school_dep_id text NOT NULL,
  district text NOT NULL,
  division text NOT NULL,
  region text NOT NULL,
  is_locked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, school_year_id)
);

CREATE TABLE academic_year_subject_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_record_id uuid NOT NULL REFERENCES academic_year_records(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  subject_name text NOT NULL,
  quarter1 smallint NOT NULL,
  quarter2 smallint NOT NULL,
  quarter3 smallint NOT NULL,
  quarter4 smallint NOT NULL,
  final_grade smallint NOT NULL,
  UNIQUE (academic_year_record_id, subject_id)
);

CREATE TABLE remedial_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_record_id uuid NOT NULL REFERENCES academic_year_records(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  learning_area text NOT NULL,
  final_rating smallint NOT NULL,
  remedial_class_mark smallint NOT NULL,
  recomputed_final_grade smallint NOT NULL,
  conducted_from date NOT NULL,
  conducted_to date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  display_name text NOT NULL,
  linked_student_id text REFERENCES students(student_id) ON DELETE SET NULL,
  linked_teacher_id text REFERENCES teachers(teacher_id) ON DELETE SET NULL,
  email_notifications boolean NOT NULL DEFAULT true,
  save_confirm boolean NOT NULL DEFAULT true,
  grade_alerts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX idx_classes_school_year ON classes(school_year_id);
CREATE INDEX idx_classes_adviser ON classes(adviser_teacher_id);
CREATE INDEX idx_classes_grade_level ON classes(grade_level, school_year_id);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_name ON students(last_name, first_name);
CREATE INDEX idx_grade_records_student_sy ON grade_records(student_id, school_year_id);
CREATE INDEX idx_grade_records_class_subject_sy ON grade_records(class_id, subject_id, school_year_id);
CREATE INDEX idx_ta_teacher ON teaching_assignments(teacher_id, school_year_id);
CREATE INDEX idx_ta_class ON teaching_assignments(class_id);
CREATE INDEX idx_ayr_student ON academic_year_records(student_id, school_year_id DESC);
CREATE UNIQUE INDEX idx_one_active_school_year ON school_years(is_active) WHERE is_active = true;

-- -----------------------------------------------------------------------------
-- 5. FUNCTIONS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION seeded_grade(seed text, min_val int DEFAULT 82, max_val int DEFAULT 97)
RETURNS int LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  hash bigint := 0;
  i int;
  ch int;
  span int;
BEGIN
  FOR i IN 1..length(seed) LOOP
    ch := get_byte(convert_to(substr(seed, i, 1), 'UTF8'), 0);
    hash := (hash * 31 + ch) & 4294967295;
  END LOOP;
  span := max_val - min_val + 1;
  RETURN min_val + (hash % span);
END;
$$;

CREATE OR REPLACE FUNCTION compute_final_grade_jhs(q1 numeric, q2 numeric, q3 numeric, q4 numeric)
RETURNS smallint LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF q1 IS NULL OR q2 IS NULL OR q3 IS NULL OR q4 IS NULL THEN RETURN NULL; END IF;
  RETURN round((q1 + q2 + q3 + q4) / 4.0)::smallint;
END;
$$;

CREATE OR REPLACE FUNCTION compute_final_grade_for_level(
  p_grade_level grade_level_type,
  q1 numeric, q2 numeric, q3 numeric, q4 numeric
)
RETURNS smallint LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  term_count int;
BEGIN
  SELECT cc.term_count INTO term_count FROM curriculum_configs cc WHERE cc.grade_level = p_grade_level;
  IF term_count = 3 THEN
    IF q1 IS NULL OR q2 IS NULL OR q3 IS NULL THEN RETURN NULL; END IF;
    RETURN round((q1 + q2 + q3) / 3.0)::smallint;
  END IF;
  RETURN compute_final_grade_jhs(q1, q2, q3, q4);
END;
$$;

CREATE OR REPLACE FUNCTION recompute_grade_record_final()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.final_grade := compute_final_grade_for_level(NEW.grade_level, NEW.quarter1, NEW.quarter2, NEW.quarter3, NEW.quarter4);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grade_records_final
  BEFORE INSERT OR UPDATE ON grade_records
  FOR EACH ROW EXECUTE FUNCTION recompute_grade_record_final();

CREATE TRIGGER trg_schools_updated BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_teachers_updated BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_grade_records_updated BEFORE UPDATE ON grade_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_profiles_updated BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auth helper: student login by LRN + demo password (replace with Supabase Auth later)
CREATE OR REPLACE FUNCTION login_student(p_lrn text, p_password text)
RETURNS TABLE(student_id text, display_name text, lrn text) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT s.student_id, s.display_name, s.lrn
  FROM students s
  WHERE s.lrn = trim(p_lrn) AND s.demo_password = p_password AND s.status = 'Active';
$$;

CREATE OR REPLACE FUNCTION login_teacher(p_id_or_email text, p_password text)
RETURNS TABLE(teacher_id text, display_name text, email citext) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT t.teacher_id, t.name, t.email
  FROM teachers t
  WHERE (lower(t.teacher_id) = lower(trim(p_id_or_email)) OR lower(t.email::text) = lower(trim(p_id_or_email)))
    AND t.demo_password = p_password;
$$;

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_year_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_year_subject_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE remedial_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Open read for authenticated users (tighten per-role when Auth is wired)
CREATE POLICY schools_read ON schools FOR SELECT TO authenticated USING (true);
CREATE POLICY school_years_read ON school_years FOR SELECT TO authenticated USING (true);
CREATE POLICY subjects_read ON subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY curriculum_configs_read ON curriculum_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY curriculum_periods_read ON curriculum_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY teachers_read ON teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY classes_read ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY teaching_assignments_read ON teaching_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY students_read ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY grade_records_read ON grade_records FOR SELECT TO authenticated USING (true);
CREATE POLICY academic_year_records_read ON academic_year_records FOR SELECT TO authenticated USING (true);
CREATE POLICY academic_year_subject_grades_read ON academic_year_subject_grades FOR SELECT TO authenticated USING (true);
CREATE POLICY remedial_classes_read ON remedial_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY user_profiles_read ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY user_profiles_update ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Teacher write on grade_records (simplified — refine with JWT claims in production)
CREATE POLICY grade_records_teacher_write ON grade_records
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY students_teacher_insert ON students
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow anon read for demo until Auth migration (optional — comment out in production)
CREATE POLICY schools_anon_read ON schools FOR SELECT TO anon USING (true);
CREATE POLICY school_years_anon_read ON school_years FOR SELECT TO anon USING (true);
CREATE POLICY subjects_anon_read ON subjects FOR SELECT TO anon USING (true);
CREATE POLICY curriculum_configs_anon_read ON curriculum_configs FOR SELECT TO anon USING (true);
CREATE POLICY curriculum_periods_anon_read ON curriculum_periods FOR SELECT TO anon USING (true);
CREATE POLICY teachers_anon_read ON teachers FOR SELECT TO anon USING (true);
CREATE POLICY classes_anon_read ON classes FOR SELECT TO anon USING (true);
CREATE POLICY teaching_assignments_anon_read ON teaching_assignments FOR SELECT TO anon USING (true);
CREATE POLICY students_anon_read ON students FOR SELECT TO anon USING (true);
CREATE POLICY grade_records_anon_read ON grade_records FOR SELECT TO anon USING (true);
CREATE POLICY academic_year_records_anon_read ON academic_year_records FOR SELECT TO anon USING (true);
CREATE POLICY academic_year_subject_grades_anon_read ON academic_year_subject_grades FOR SELECT TO anon USING (true);
CREATE POLICY remedial_classes_anon_read ON remedial_classes FOR SELECT TO anon USING (true);

-- -----------------------------------------------------------------------------
-- 7. VIEWS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_general_average AS
SELECT
  gr.student_id,
  gr.school_year_id,
  round(avg(gr.final_grade::numeric), 0)::smallint AS general_average,
  count(*) FILTER (WHERE gr.final_grade IS NOT NULL) AS graded_subjects,
  count(*) AS total_subjects
FROM grade_records gr
GROUP BY gr.student_id, gr.school_year_id;

-- -----------------------------------------------------------------------------
-- 8. SEED DATA
-- -----------------------------------------------------------------------------

INSERT INTO schools (school_id, name, district, address, division, region)
VALUES (${esc(SCHOOL.schoolId)}, ${esc(SCHOOL.name)}, ${esc(SCHOOL.district)}, ${esc(SCHOOL.address)}, ${esc(SCHOOL.division)}, ${esc(SCHOOL.region)});

`);

// School years
const syValues = SCHOOL_YEARS.map((sy, i) => {
  const active = sy === ACTIVE_SCHOOL_YEAR;
  return `(${esc(sy)}, ${esc(sy)}, ${active}, ${SCHOOL_YEARS.length - i})`;
});
lines.push(`INSERT INTO school_years (id, label, is_active, sort_order) VALUES\n${syValues.join(',\n')};\n`);

// Subjects
const subjValues = SUBJECTS.map((s, i) => `(${esc(s.id)}, ${esc(s.name)}, ${i + 1})`);
lines.push(`INSERT INTO subjects (id, name, sort_order) VALUES\n${subjValues.join(',\n')};\n`);

// Curriculum
for (const [gradeLevel, cfg] of Object.entries(CURRICULUM_BY_GRADE)) {
  lines.push(`INSERT INTO curriculum_configs (grade_level, scale, final_label, term_count)
VALUES (${esc(gradeLevel)}::grade_level_type, ${esc(cfg.scale)}::curriculum_scale, ${esc(cfg.finalLabel)}, ${cfg.periods.length});`);
  cfg.periods.forEach((p, i) => {
    lines.push(`INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES (${esc(gradeLevel)}::grade_level_type, ${esc(p.id)}, ${esc(p.label)}, ${esc(p.field)}, ${i + 1});`);
  });
}
lines.push('');

// Teachers
for (const t of TEACHERS) {
  lines.push(`INSERT INTO teachers (teacher_id, name, email, position, demo_password)
VALUES (${esc(t.teacherId)}, ${esc(t.name)}, ${esc(t.email)}, ${esc(t.position)}, ${esc(t.password)});`);
}
lines.push('');

// Classes - need school uuid via subquery
for (const c of CLASSES) {
  lines.push(`INSERT INTO classes (id, school_id, school_year_id, grade_level, section, adviser_teacher_id)
VALUES (${esc(c.id)}, (SELECT id FROM schools LIMIT 1), ${esc(c.schoolYear)}, ${esc(c.gradeLevel)}::grade_level_type, ${esc(c.section)}, ${esc(c.adviserId)});`);
}
lines.push('');

// Teaching assignments
for (const a of TEACHING_ASSIGNMENTS) {
  const cls = CLASSES.find((c) => c.id === a.classId);
  lines.push(`INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES (${esc(a.teacherId)}, ${esc(a.classId)}, ${esc(a.subjectId)}, ${esc(cls.schoolYear)});`);
}
lines.push('');

// Students
for (const s of INITIAL_STUDENTS) {
  lines.push(`INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES (${esc(s.studentId)}, ${esc(s.lrn)}, ${esc(s.lastName)}, ${esc(s.firstName)}, ${esc(s.middleName)}, ${esc(s.nameExtension)}, ${esc(s.name)}, ${esc(s.sex)}::sex_type, ${esc(s.birthdate)}, ${esc(s.classId)}, ${esc(s.status)}::student_status, ${esc(s.password)});`);
}
lines.push('');

// Current year grade records
for (const g of INITIAL_GRADES) {
  lines.push(`INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES (${esc(g.studentId)}, ${esc(g.classId)}, ${esc(g.subjectId)}, ${esc(g.schoolYear)}, ${esc(g.gradeLevel)}::grade_level_type, ${escNum(g.quarter1)}, ${escNum(g.quarter2)}, ${escNum(g.quarter3)}, ${escNum(g.quarter4)}, ${escNum(g.finalGrade)}, 'draft');`);
}
lines.push('');

// Academic history - use temp mapping via DO block with generated UUIDs
lines.push(`-- Academic history (locked prior school years)`);
for (const student of INITIAL_STUDENTS) {
  const years = ACADEMIC_HISTORY[student.studentId] ?? [];
  for (const year of years) {
    const ayrVar = `ayr_${student.studentId.replace(/-/g, '_')}_${year.schoolYear.replace(/-/g, '_')}`;
    lines.push(`
DO $$ DECLARE ${ayrVar} uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES (${esc(student.studentId)}, ${esc(year.schoolYear)}, ${esc(year.gradeLevel)}::grade_level_type, ${esc(year.section)}, ${esc(year.adviser)}, ${esc(year.school)}, ${esc(year.schoolId)}, ${esc(year.district)}, ${esc(year.division)}, ${esc(year.region)}, true)
  RETURNING id INTO ${ayrVar};`);

    for (const subj of year.subjects) {
      lines.push(`  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (${ayrVar}, ${esc(subj.subjectId)}, ${esc(subj.subjectName)}, ${subj.quarter1}, ${subj.quarter2}, ${subj.quarter3}, ${subj.quarter4}, ${subj.finalGrade});`);
    }

    for (const rem of year.remedialClasses ?? []) {
      lines.push(`  INSERT INTO remedial_classes (academic_year_record_id, subject_id, learning_area, final_rating, remedial_class_mark, recomputed_final_grade, conducted_from, conducted_to)
  VALUES (${ayrVar}, ${esc(rem.subjectId)}, ${esc(rem.learningArea)}, ${rem.finalRating}, ${rem.remedialClassMark}, ${rem.recomputedFinalGrade}, ${esc(rem.conductedFrom)}, ${esc(rem.conductedTo)});`);
    }

    lines.push(`END $$;`);
  }
}

lines.push(`
-- -----------------------------------------------------------------------------
-- 9. GRANTS (Supabase API access)
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_student(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_teacher(text, text) TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON grade_records TO authenticated;
GRANT INSERT ON students TO authenticated;

-- -----------------------------------------------------------------------------
-- DONE
-- -----------------------------------------------------------------------------
-- Tables seeded:
--   schools: 1 | school_years: ${SCHOOL_YEARS.length} | subjects: ${SUBJECTS.length}
--   teachers: ${TEACHERS.length} | classes: ${CLASSES.length} | teaching_assignments: ${TEACHING_ASSIGNMENTS.length}
--   students: ${INITIAL_STUDENTS.length} | grade_records: ${INITIAL_GRADES.length}
--   academic history: ${Object.values(ACADEMIC_HISTORY).reduce((n, y) => n + y.length, 0)} year records
-- =============================================================================
`);

const output = lines.join('\n');
writeFileSync(new URL('../supabase/full_schema.sql', import.meta.url), output, 'utf8');
console.log('Wrote supabase/full_schema.sql (' + (output.length / 1024).toFixed(1) + ' KB)');
