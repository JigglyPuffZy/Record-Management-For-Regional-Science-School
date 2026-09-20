-- =============================================================================
-- SF10 & Class Record Management System
-- Complete Supabase schema + seed data (single file)
--
-- Project: Bagong Pag-asa National High School
-- Active SY: 2026-2027
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
VALUES ('301234', 'Bagong Pag-asa National High School', 'Quezon City District IV', 'Brgy. San Isidro, Quezon City, Metro Manila', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)');


INSERT INTO school_years (id, label, is_active, sort_order) VALUES
('2026-2027', '2026-2027', true, 4),
('2025-2026', '2025-2026', false, 3),
('2024-2025', '2024-2025', false, 2),
('2023-2024', '2023-2024', false, 1);

INSERT INTO subjects (id, name, sort_order) VALUES
('FIL', 'Filipino', 1),
('ENG', 'English', 2),
('MATH', 'Mathematics', 3),
('SCI', 'Science', 4),
('AP', 'Araling Panlipunan', 5),
('ESP', 'Edukasyon sa Pagpapakatao (ESP)', 6),
('TLE', 'Technology and Livelihood Education (TLE)', 7),
('MAPEH', 'MAPEH', 8),
('MUSIC_ARTS', 'Music and Arts', 9),
('PE_HEALTH', 'Physical Education and Health', 10);

INSERT INTO curriculum_configs (grade_level, scale, final_label, term_count)
VALUES ('Grade 7'::grade_level_type, 'jhs'::curriculum_scale, 'Final Rating', 4);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 7'::grade_level_type, 'term1', 'Term 1', 'quarter1', 1);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 7'::grade_level_type, 'term2', 'Term 2', 'quarter2', 2);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 7'::grade_level_type, 'term3', 'Term 3', 'quarter3', 3);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 7'::grade_level_type, 'term4', 'Term 4', 'quarter4', 4);
INSERT INTO curriculum_configs (grade_level, scale, final_label, term_count)
VALUES ('Grade 8'::grade_level_type, 'jhs'::curriculum_scale, 'Final Rating', 4);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 8'::grade_level_type, 'term1', 'Term 1', 'quarter1', 1);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 8'::grade_level_type, 'term2', 'Term 2', 'quarter2', 2);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 8'::grade_level_type, 'term3', 'Term 3', 'quarter3', 3);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 8'::grade_level_type, 'term4', 'Term 4', 'quarter4', 4);
INSERT INTO curriculum_configs (grade_level, scale, final_label, term_count)
VALUES ('Grade 9'::grade_level_type, 'jhs'::curriculum_scale, 'Final Rating', 4);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 9'::grade_level_type, 'term1', 'Term 1', 'quarter1', 1);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 9'::grade_level_type, 'term2', 'Term 2', 'quarter2', 2);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 9'::grade_level_type, 'term3', 'Term 3', 'quarter3', 3);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 9'::grade_level_type, 'term4', 'Term 4', 'quarter4', 4);
INSERT INTO curriculum_configs (grade_level, scale, final_label, term_count)
VALUES ('Grade 10'::grade_level_type, 'grade10'::curriculum_scale, 'Final Rating', 3);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 10'::grade_level_type, 'term1', 'Term 1', 'quarter1', 1);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 10'::grade_level_type, 'term2', 'Term 2', 'quarter2', 2);
INSERT INTO curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
VALUES ('Grade 10'::grade_level_type, 'term3', 'Term 3', 'quarter3', 3);

INSERT INTO teachers (teacher_id, name, email, position, demo_password)
VALUES ('T-2001', 'Ramon Santos', 'ramon.santos@depedqc.edu.ph', 'Teacher III', 'teacher123');
INSERT INTO teachers (teacher_id, name, email, position, demo_password)
VALUES ('T-2002', 'Liza Fernandez', 'liza.fernandez@depedqc.edu.ph', 'Teacher II', 'teacher123');
INSERT INTO teachers (teacher_id, name, email, position, demo_password)
VALUES ('T-2003', 'Edgar Cruz', 'edgar.cruz@depedqc.edu.ph', 'Teacher I', 'teacher123');
INSERT INTO teachers (teacher_id, name, email, position, demo_password)
VALUES ('T-2004', 'Corazon Villanueva', 'corazon.villanueva@depedqc.edu.ph', 'Teacher II', 'teacher123');

INSERT INTO classes (id, school_id, school_year_id, grade_level, section, adviser_teacher_id)
VALUES ('G7-RIZAL', (SELECT id FROM schools LIMIT 1), '2026-2027', 'Grade 7'::grade_level_type, 'Rizal', 'T-2003');
INSERT INTO classes (id, school_id, school_year_id, grade_level, section, adviser_teacher_id)
VALUES ('G8-BONIFACIO', (SELECT id FROM schools LIMIT 1), '2026-2027', 'Grade 8'::grade_level_type, 'Bonifacio', 'T-2002');
INSERT INTO classes (id, school_id, school_year_id, grade_level, section, adviser_teacher_id)
VALUES ('G9-MABINI', (SELECT id FROM schools LIMIT 1), '2026-2027', 'Grade 9'::grade_level_type, 'Mabini', 'T-2001');
INSERT INTO classes (id, school_id, school_year_id, grade_level, section, adviser_teacher_id)
VALUES ('G10-RIZAL', (SELECT id FROM schools LIMIT 1), '2026-2027', 'Grade 10'::grade_level_type, 'Rizal', 'T-2001');

INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2001', 'G7-RIZAL', 'MATH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2001', 'G8-BONIFACIO', 'MATH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2001', 'G9-MABINI', 'MATH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2001', 'G10-RIZAL', 'MATH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2001', 'G7-RIZAL', 'SCI', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2001', 'G8-BONIFACIO', 'SCI', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2001', 'G9-MABINI', 'SCI', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2001', 'G10-RIZAL', 'SCI', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2002', 'G7-RIZAL', 'FIL', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2002', 'G8-BONIFACIO', 'FIL', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2002', 'G9-MABINI', 'FIL', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2002', 'G10-RIZAL', 'FIL', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2002', 'G7-RIZAL', 'ENG', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2002', 'G8-BONIFACIO', 'ENG', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2002', 'G9-MABINI', 'ENG', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2002', 'G10-RIZAL', 'ENG', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G7-RIZAL', 'AP', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G8-BONIFACIO', 'AP', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G9-MABINI', 'AP', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G10-RIZAL', 'AP', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G7-RIZAL', 'ESP', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G8-BONIFACIO', 'ESP', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G9-MABINI', 'ESP', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G10-RIZAL', 'ESP', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G7-RIZAL', 'MAPEH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G8-BONIFACIO', 'MAPEH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G9-MABINI', 'MAPEH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2003', 'G10-RIZAL', 'MAPEH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G7-RIZAL', 'TLE', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G8-BONIFACIO', 'TLE', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G9-MABINI', 'TLE', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G10-RIZAL', 'TLE', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G7-RIZAL', 'MUSIC_ARTS', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G8-BONIFACIO', 'MUSIC_ARTS', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G9-MABINI', 'MUSIC_ARTS', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G10-RIZAL', 'MUSIC_ARTS', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G7-RIZAL', 'PE_HEALTH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G8-BONIFACIO', 'PE_HEALTH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G9-MABINI', 'PE_HEALTH', '2026-2027');
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
VALUES ('T-2004', 'G10-RIZAL', 'PE_HEALTH', '2026-2027');

INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-001', '136045210001', 'Dela Cruz', 'Juan', 'Ramos', '', 'Juan Dela Cruz', 'Male'::sex_type, '2011-03-14', 'G10-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-002', '136045210002', 'Santos', 'Maria', 'Reyes', '', 'Maria Santos', 'Female'::sex_type, '2011-07-22', 'G10-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-003', '136045210003', 'Reyes', 'Pedro', 'Garcia', '', 'Pedro Reyes', 'Male'::sex_type, '2011-01-30', 'G10-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-004', '136045210004', 'Garcia', 'Ana', 'Torres', '', 'Ana Garcia', 'Female'::sex_type, '2011-11-05', 'G10-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-005', '136045210005', 'Mendoza', 'Carlo', 'Bautista', '', 'Carlo Mendoza', 'Male'::sex_type, '2011-05-18', 'G10-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-006', '136045210006', 'Ramos', 'Isabel', 'Cruz', '', 'Isabel Ramos', 'Female'::sex_type, '2011-09-09', 'G10-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-007', '136045210007', 'Torres', 'Miguel', 'Villareal', 'Jr.', 'Miguel Torres Jr.', 'Male'::sex_type, '2011-02-27', 'G10-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-008', '136045210008', 'Bautista', 'Katrina', 'Domingo', '', 'Katrina Bautista', 'Female'::sex_type, '2012-04-11', 'G8-BONIFACIO', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-009', '136045210009', 'Villareal', 'Joshua', 'Aquino', '', 'Joshua Villareal', 'Male'::sex_type, '2012-08-19', 'G8-BONIFACIO', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-010', '136045210010', 'Domingo', 'Angelica', 'Castro', '', 'Angelica Domingo', 'Female'::sex_type, '2012-12-02', 'G8-BONIFACIO', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-011', '136045210011', 'Aquino', 'Rafael', 'Lim', '', 'Rafael Aquino', 'Male'::sex_type, '2012-06-25', 'G8-BONIFACIO', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-012', '136045210012', 'Castro', 'Bianca', 'Bautista', '', 'Bianca Castro', 'Female'::sex_type, '2012-10-14', 'G8-BONIFACIO', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-013', '136045210013', 'Lim', 'Vincent', 'Santos', '', 'Vincent Lim', 'Male'::sex_type, '2012-03-08', 'G8-BONIFACIO', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-014', '136045210014', 'Ocampo', 'Nicole', 'Salazar', '', 'Nicole Ocampo', 'Female'::sex_type, '2013-01-17', 'G7-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-015', '136045210015', 'Salazar', 'Gabriel', 'Marquez', '', 'Gabriel Salazar', 'Male'::sex_type, '2013-05-23', 'G7-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-016', '136045210016', 'Marquez', 'Trisha', 'Padilla', '', 'Trisha Marquez', 'Female'::sex_type, '2013-09-30', 'G7-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-017', '136045210017', 'Padilla', 'Emmanuel', 'Reyes', '', 'Emmanuel Padilla', 'Male'::sex_type, '2013-02-14', 'G7-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-018', '136045210018', 'Reyes', 'Samantha', 'Aguilar', '', 'Samantha Reyes', 'Female'::sex_type, '2013-07-08', 'G7-RIZAL', 'Active'::student_status, 'student123');
INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, name_extension, display_name, sex, birthdate, class_id, status, demo_password)
VALUES ('2026-019', '136045210019', 'Aguilar', 'Kevin', 'Ocampo', '', 'Kevin Aguilar', 'Male'::sex_type, '2013-11-21', 'G7-RIZAL', 'Active'::student_status, 'student123');

INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-014', 'G7-RIZAL', 'MATH', '2026-2027', 'Grade 7'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-015', 'G7-RIZAL', 'MATH', '2026-2027', 'Grade 7'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-016', 'G7-RIZAL', 'MATH', '2026-2027', 'Grade 7'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-017', 'G7-RIZAL', 'MATH', '2026-2027', 'Grade 7'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-018', 'G7-RIZAL', 'MATH', '2026-2027', 'Grade 7'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-019', 'G7-RIZAL', 'MATH', '2026-2027', 'Grade 7'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-014', 'G7-RIZAL', 'SCI', '2026-2027', 'Grade 7'::grade_level_type, 92, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-015', 'G7-RIZAL', 'SCI', '2026-2027', 'Grade 7'::grade_level_type, 91, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-016', 'G7-RIZAL', 'SCI', '2026-2027', 'Grade 7'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-017', 'G7-RIZAL', 'SCI', '2026-2027', 'Grade 7'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-018', 'G7-RIZAL', 'SCI', '2026-2027', 'Grade 7'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-019', 'G7-RIZAL', 'SCI', '2026-2027', 'Grade 7'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-014', 'G7-RIZAL', 'FIL', '2026-2027', 'Grade 7'::grade_level_type, 92, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-015', 'G7-RIZAL', 'FIL', '2026-2027', 'Grade 7'::grade_level_type, 91, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-016', 'G7-RIZAL', 'FIL', '2026-2027', 'Grade 7'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-017', 'G7-RIZAL', 'FIL', '2026-2027', 'Grade 7'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-018', 'G7-RIZAL', 'FIL', '2026-2027', 'Grade 7'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-019', 'G7-RIZAL', 'FIL', '2026-2027', 'Grade 7'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-014', 'G7-RIZAL', 'ENG', '2026-2027', 'Grade 7'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-015', 'G7-RIZAL', 'ENG', '2026-2027', 'Grade 7'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-016', 'G7-RIZAL', 'ENG', '2026-2027', 'Grade 7'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-017', 'G7-RIZAL', 'ENG', '2026-2027', 'Grade 7'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-018', 'G7-RIZAL', 'ENG', '2026-2027', 'Grade 7'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-019', 'G7-RIZAL', 'ENG', '2026-2027', 'Grade 7'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-014', 'G7-RIZAL', 'AP', '2026-2027', 'Grade 7'::grade_level_type, 92, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-015', 'G7-RIZAL', 'AP', '2026-2027', 'Grade 7'::grade_level_type, 93, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-016', 'G7-RIZAL', 'AP', '2026-2027', 'Grade 7'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-017', 'G7-RIZAL', 'AP', '2026-2027', 'Grade 7'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-018', 'G7-RIZAL', 'AP', '2026-2027', 'Grade 7'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-019', 'G7-RIZAL', 'AP', '2026-2027', 'Grade 7'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-014', 'G7-RIZAL', 'ESP', '2026-2027', 'Grade 7'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-015', 'G7-RIZAL', 'ESP', '2026-2027', 'Grade 7'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-016', 'G7-RIZAL', 'ESP', '2026-2027', 'Grade 7'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-017', 'G7-RIZAL', 'ESP', '2026-2027', 'Grade 7'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-018', 'G7-RIZAL', 'ESP', '2026-2027', 'Grade 7'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-019', 'G7-RIZAL', 'ESP', '2026-2027', 'Grade 7'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-014', 'G7-RIZAL', 'MAPEH', '2026-2027', 'Grade 7'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-015', 'G7-RIZAL', 'MAPEH', '2026-2027', 'Grade 7'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-016', 'G7-RIZAL', 'MAPEH', '2026-2027', 'Grade 7'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-017', 'G7-RIZAL', 'MAPEH', '2026-2027', 'Grade 7'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-018', 'G7-RIZAL', 'MAPEH', '2026-2027', 'Grade 7'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-019', 'G7-RIZAL', 'MAPEH', '2026-2027', 'Grade 7'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-014', 'G7-RIZAL', 'TLE', '2026-2027', 'Grade 7'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-015', 'G7-RIZAL', 'TLE', '2026-2027', 'Grade 7'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-016', 'G7-RIZAL', 'TLE', '2026-2027', 'Grade 7'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-017', 'G7-RIZAL', 'TLE', '2026-2027', 'Grade 7'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-018', 'G7-RIZAL', 'TLE', '2026-2027', 'Grade 7'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-019', 'G7-RIZAL', 'TLE', '2026-2027', 'Grade 7'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-014', 'G7-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 7'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-015', 'G7-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 7'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-016', 'G7-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 7'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-017', 'G7-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 7'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-018', 'G7-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 7'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-019', 'G7-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 7'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-014', 'G7-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 7'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-015', 'G7-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 7'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-016', 'G7-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 7'::grade_level_type, 93, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-017', 'G7-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 7'::grade_level_type, 92, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-018', 'G7-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 7'::grade_level_type, 91, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-019', 'G7-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 7'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-008', 'G8-BONIFACIO', 'MATH', '2026-2027', 'Grade 8'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-009', 'G8-BONIFACIO', 'MATH', '2026-2027', 'Grade 8'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-010', 'G8-BONIFACIO', 'MATH', '2026-2027', 'Grade 8'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-011', 'G8-BONIFACIO', 'MATH', '2026-2027', 'Grade 8'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-012', 'G8-BONIFACIO', 'MATH', '2026-2027', 'Grade 8'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-013', 'G8-BONIFACIO', 'MATH', '2026-2027', 'Grade 8'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-008', 'G8-BONIFACIO', 'SCI', '2026-2027', 'Grade 8'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-009', 'G8-BONIFACIO', 'SCI', '2026-2027', 'Grade 8'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-010', 'G8-BONIFACIO', 'SCI', '2026-2027', 'Grade 8'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-011', 'G8-BONIFACIO', 'SCI', '2026-2027', 'Grade 8'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-012', 'G8-BONIFACIO', 'SCI', '2026-2027', 'Grade 8'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-013', 'G8-BONIFACIO', 'SCI', '2026-2027', 'Grade 8'::grade_level_type, 93, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-008', 'G8-BONIFACIO', 'FIL', '2026-2027', 'Grade 8'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-009', 'G8-BONIFACIO', 'FIL', '2026-2027', 'Grade 8'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-010', 'G8-BONIFACIO', 'FIL', '2026-2027', 'Grade 8'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-011', 'G8-BONIFACIO', 'FIL', '2026-2027', 'Grade 8'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-012', 'G8-BONIFACIO', 'FIL', '2026-2027', 'Grade 8'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-013', 'G8-BONIFACIO', 'FIL', '2026-2027', 'Grade 8'::grade_level_type, 93, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-008', 'G8-BONIFACIO', 'ENG', '2026-2027', 'Grade 8'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-009', 'G8-BONIFACIO', 'ENG', '2026-2027', 'Grade 8'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-010', 'G8-BONIFACIO', 'ENG', '2026-2027', 'Grade 8'::grade_level_type, 91, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-011', 'G8-BONIFACIO', 'ENG', '2026-2027', 'Grade 8'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-012', 'G8-BONIFACIO', 'ENG', '2026-2027', 'Grade 8'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-013', 'G8-BONIFACIO', 'ENG', '2026-2027', 'Grade 8'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-008', 'G8-BONIFACIO', 'AP', '2026-2027', 'Grade 8'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-009', 'G8-BONIFACIO', 'AP', '2026-2027', 'Grade 8'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-010', 'G8-BONIFACIO', 'AP', '2026-2027', 'Grade 8'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-011', 'G8-BONIFACIO', 'AP', '2026-2027', 'Grade 8'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-012', 'G8-BONIFACIO', 'AP', '2026-2027', 'Grade 8'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-013', 'G8-BONIFACIO', 'AP', '2026-2027', 'Grade 8'::grade_level_type, 91, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-008', 'G8-BONIFACIO', 'ESP', '2026-2027', 'Grade 8'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-009', 'G8-BONIFACIO', 'ESP', '2026-2027', 'Grade 8'::grade_level_type, 93, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-010', 'G8-BONIFACIO', 'ESP', '2026-2027', 'Grade 8'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-011', 'G8-BONIFACIO', 'ESP', '2026-2027', 'Grade 8'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-012', 'G8-BONIFACIO', 'ESP', '2026-2027', 'Grade 8'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-013', 'G8-BONIFACIO', 'ESP', '2026-2027', 'Grade 8'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-008', 'G8-BONIFACIO', 'MAPEH', '2026-2027', 'Grade 8'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-009', 'G8-BONIFACIO', 'MAPEH', '2026-2027', 'Grade 8'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-010', 'G8-BONIFACIO', 'MAPEH', '2026-2027', 'Grade 8'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-011', 'G8-BONIFACIO', 'MAPEH', '2026-2027', 'Grade 8'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-012', 'G8-BONIFACIO', 'MAPEH', '2026-2027', 'Grade 8'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-013', 'G8-BONIFACIO', 'MAPEH', '2026-2027', 'Grade 8'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-008', 'G8-BONIFACIO', 'TLE', '2026-2027', 'Grade 8'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-009', 'G8-BONIFACIO', 'TLE', '2026-2027', 'Grade 8'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-010', 'G8-BONIFACIO', 'TLE', '2026-2027', 'Grade 8'::grade_level_type, 92, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-011', 'G8-BONIFACIO', 'TLE', '2026-2027', 'Grade 8'::grade_level_type, 91, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-012', 'G8-BONIFACIO', 'TLE', '2026-2027', 'Grade 8'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-013', 'G8-BONIFACIO', 'TLE', '2026-2027', 'Grade 8'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-008', 'G8-BONIFACIO', 'MUSIC_ARTS', '2026-2027', 'Grade 8'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-009', 'G8-BONIFACIO', 'MUSIC_ARTS', '2026-2027', 'Grade 8'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-010', 'G8-BONIFACIO', 'MUSIC_ARTS', '2026-2027', 'Grade 8'::grade_level_type, 93, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-011', 'G8-BONIFACIO', 'MUSIC_ARTS', '2026-2027', 'Grade 8'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-012', 'G8-BONIFACIO', 'MUSIC_ARTS', '2026-2027', 'Grade 8'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-013', 'G8-BONIFACIO', 'MUSIC_ARTS', '2026-2027', 'Grade 8'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-008', 'G8-BONIFACIO', 'PE_HEALTH', '2026-2027', 'Grade 8'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-009', 'G8-BONIFACIO', 'PE_HEALTH', '2026-2027', 'Grade 8'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-010', 'G8-BONIFACIO', 'PE_HEALTH', '2026-2027', 'Grade 8'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-011', 'G8-BONIFACIO', 'PE_HEALTH', '2026-2027', 'Grade 8'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-012', 'G8-BONIFACIO', 'PE_HEALTH', '2026-2027', 'Grade 8'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-013', 'G8-BONIFACIO', 'PE_HEALTH', '2026-2027', 'Grade 8'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-001', 'G10-RIZAL', 'MATH', '2026-2027', 'Grade 10'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-002', 'G10-RIZAL', 'MATH', '2026-2027', 'Grade 10'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-003', 'G10-RIZAL', 'MATH', '2026-2027', 'Grade 10'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-004', 'G10-RIZAL', 'MATH', '2026-2027', 'Grade 10'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-005', 'G10-RIZAL', 'MATH', '2026-2027', 'Grade 10'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-006', 'G10-RIZAL', 'MATH', '2026-2027', 'Grade 10'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-007', 'G10-RIZAL', 'MATH', '2026-2027', 'Grade 10'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-001', 'G10-RIZAL', 'SCI', '2026-2027', 'Grade 10'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-002', 'G10-RIZAL', 'SCI', '2026-2027', 'Grade 10'::grade_level_type, 93, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-003', 'G10-RIZAL', 'SCI', '2026-2027', 'Grade 10'::grade_level_type, 92, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-004', 'G10-RIZAL', 'SCI', '2026-2027', 'Grade 10'::grade_level_type, 91, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-005', 'G10-RIZAL', 'SCI', '2026-2027', 'Grade 10'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-006', 'G10-RIZAL', 'SCI', '2026-2027', 'Grade 10'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-007', 'G10-RIZAL', 'SCI', '2026-2027', 'Grade 10'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-001', 'G10-RIZAL', 'FIL', '2026-2027', 'Grade 10'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-002', 'G10-RIZAL', 'FIL', '2026-2027', 'Grade 10'::grade_level_type, 93, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-003', 'G10-RIZAL', 'FIL', '2026-2027', 'Grade 10'::grade_level_type, 92, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-004', 'G10-RIZAL', 'FIL', '2026-2027', 'Grade 10'::grade_level_type, 91, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-005', 'G10-RIZAL', 'FIL', '2026-2027', 'Grade 10'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-006', 'G10-RIZAL', 'FIL', '2026-2027', 'Grade 10'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-007', 'G10-RIZAL', 'FIL', '2026-2027', 'Grade 10'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-001', 'G10-RIZAL', 'ENG', '2026-2027', 'Grade 10'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-002', 'G10-RIZAL', 'ENG', '2026-2027', 'Grade 10'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-003', 'G10-RIZAL', 'ENG', '2026-2027', 'Grade 10'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-004', 'G10-RIZAL', 'ENG', '2026-2027', 'Grade 10'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-005', 'G10-RIZAL', 'ENG', '2026-2027', 'Grade 10'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-006', 'G10-RIZAL', 'ENG', '2026-2027', 'Grade 10'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-007', 'G10-RIZAL', 'ENG', '2026-2027', 'Grade 10'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-001', 'G10-RIZAL', 'AP', '2026-2027', 'Grade 10'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-002', 'G10-RIZAL', 'AP', '2026-2027', 'Grade 10'::grade_level_type, 91, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-003', 'G10-RIZAL', 'AP', '2026-2027', 'Grade 10'::grade_level_type, 92, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-004', 'G10-RIZAL', 'AP', '2026-2027', 'Grade 10'::grade_level_type, 93, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-005', 'G10-RIZAL', 'AP', '2026-2027', 'Grade 10'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-006', 'G10-RIZAL', 'AP', '2026-2027', 'Grade 10'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-007', 'G10-RIZAL', 'AP', '2026-2027', 'Grade 10'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-001', 'G10-RIZAL', 'ESP', '2026-2027', 'Grade 10'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-002', 'G10-RIZAL', 'ESP', '2026-2027', 'Grade 10'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-003', 'G10-RIZAL', 'ESP', '2026-2027', 'Grade 10'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-004', 'G10-RIZAL', 'ESP', '2026-2027', 'Grade 10'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-005', 'G10-RIZAL', 'ESP', '2026-2027', 'Grade 10'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-006', 'G10-RIZAL', 'ESP', '2026-2027', 'Grade 10'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-007', 'G10-RIZAL', 'ESP', '2026-2027', 'Grade 10'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-001', 'G10-RIZAL', 'MAPEH', '2026-2027', 'Grade 10'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-002', 'G10-RIZAL', 'MAPEH', '2026-2027', 'Grade 10'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-003', 'G10-RIZAL', 'MAPEH', '2026-2027', 'Grade 10'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-004', 'G10-RIZAL', 'MAPEH', '2026-2027', 'Grade 10'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-005', 'G10-RIZAL', 'MAPEH', '2026-2027', 'Grade 10'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-006', 'G10-RIZAL', 'MAPEH', '2026-2027', 'Grade 10'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-007', 'G10-RIZAL', 'MAPEH', '2026-2027', 'Grade 10'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-001', 'G10-RIZAL', 'TLE', '2026-2027', 'Grade 10'::grade_level_type, 90, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-002', 'G10-RIZAL', 'TLE', '2026-2027', 'Grade 10'::grade_level_type, 89, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-003', 'G10-RIZAL', 'TLE', '2026-2027', 'Grade 10'::grade_level_type, 88, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-004', 'G10-RIZAL', 'TLE', '2026-2027', 'Grade 10'::grade_level_type, 87, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-005', 'G10-RIZAL', 'TLE', '2026-2027', 'Grade 10'::grade_level_type, 86, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-006', 'G10-RIZAL', 'TLE', '2026-2027', 'Grade 10'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-007', 'G10-RIZAL', 'TLE', '2026-2027', 'Grade 10'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-001', 'G10-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 10'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-002', 'G10-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 10'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-003', 'G10-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 10'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-004', 'G10-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 10'::grade_level_type, 82, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-005', 'G10-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 10'::grade_level_type, 83, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-006', 'G10-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 10'::grade_level_type, 84, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-007', 'G10-RIZAL', 'MUSIC_ARTS', '2026-2027', 'Grade 10'::grade_level_type, 85, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-001', 'G10-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 10'::grade_level_type, 97, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-002', 'G10-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 10'::grade_level_type, 96, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-003', 'G10-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 10'::grade_level_type, 95, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-004', 'G10-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 10'::grade_level_type, 94, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-005', 'G10-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 10'::grade_level_type, 93, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-006', 'G10-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 10'::grade_level_type, 92, NULL, NULL, NULL, NULL, 'draft');
INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, quarter1, quarter2, quarter3, quarter4, final_grade, status)
VALUES ('2026-007', 'G10-RIZAL', 'PE_HEALTH', '2026-2027', 'Grade 10'::grade_level_type, 91, NULL, NULL, NULL, NULL, 'draft');

-- Academic history (locked prior school years)

DO $$ DECLARE ayr_2026_001_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-001', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_001_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2023_2024, 'FIL', 'Filipino', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2023_2024, 'ENG', 'English', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2023_2024, 'MATH', 'Mathematics', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2023_2024, 'SCI', 'Science', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2023_2024, 'AP', 'Araling Panlipunan', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2023_2024, 'MAPEH', 'MAPEH', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 93, 94, 95, 80, 91);
END $$;

DO $$ DECLARE ayr_2026_001_2024_2025 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-001', '2024-2025', 'Grade 8'::grade_level_type, 'Bonifacio', 'Liza Fernandez', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_001_2024_2025;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2024_2025, 'FIL', 'Filipino', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2024_2025, 'ENG', 'English', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2024_2025, 'MATH', 'Mathematics', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2024_2025, 'SCI', 'Science', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2024_2025, 'AP', 'Araling Panlipunan', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2024_2025, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2024_2025, 'TLE', 'Technology and Livelihood Education (TLE)', 72, 74, 71, 73, 73);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2024_2025, 'MAPEH', 'MAPEH', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2024_2025, 'MUSIC_ARTS', 'Music and Arts', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2024_2025, 'PE_HEALTH', 'Physical Education and Health', 93, 94, 95, 80, 91);
  INSERT INTO remedial_classes (academic_year_record_id, subject_id, learning_area, final_rating, remedial_class_mark, recomputed_final_grade, conducted_from, conducted_to)
  VALUES (ayr_2026_001_2024_2025, 'TLE', 'Technology and Livelihood Education (TLE)', 73, 82, 78, '2025-04-07', '2025-04-25');
END $$;

DO $$ DECLARE ayr_2026_001_2025_2026 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-001', '2025-2026', 'Grade 9'::grade_level_type, 'Mabini', 'Ramon Santos', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_001_2025_2026;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2025_2026, 'FIL', 'Filipino', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2025_2026, 'ENG', 'English', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2025_2026, 'MATH', 'Mathematics', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2025_2026, 'SCI', 'Science', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2025_2026, 'AP', 'Araling Panlipunan', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2025_2026, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2025_2026, 'TLE', 'Technology and Livelihood Education (TLE)', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2025_2026, 'MAPEH', 'MAPEH', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2025_2026, 'MUSIC_ARTS', 'Music and Arts', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_001_2025_2026, 'PE_HEALTH', 'Physical Education and Health', 93, 94, 95, 80, 91);
END $$;

DO $$ DECLARE ayr_2026_002_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-002', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_002_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2023_2024, 'FIL', 'Filipino', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2023_2024, 'ENG', 'English', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2023_2024, 'MATH', 'Mathematics', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2023_2024, 'SCI', 'Science', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2023_2024, 'AP', 'Araling Panlipunan', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2023_2024, 'MAPEH', 'MAPEH', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 92, 93, 94, 95, 94);
END $$;

DO $$ DECLARE ayr_2026_002_2024_2025 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-002', '2024-2025', 'Grade 8'::grade_level_type, 'Bonifacio', 'Liza Fernandez', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_002_2024_2025;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2024_2025, 'FIL', 'Filipino', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2024_2025, 'ENG', 'English', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2024_2025, 'MATH', 'Mathematics', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2024_2025, 'SCI', 'Science', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2024_2025, 'AP', 'Araling Panlipunan', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2024_2025, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2024_2025, 'TLE', 'Technology and Livelihood Education (TLE)', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2024_2025, 'MAPEH', 'MAPEH', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2024_2025, 'MUSIC_ARTS', 'Music and Arts', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2024_2025, 'PE_HEALTH', 'Physical Education and Health', 92, 93, 94, 95, 94);
END $$;

DO $$ DECLARE ayr_2026_002_2025_2026 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-002', '2025-2026', 'Grade 9'::grade_level_type, 'Mabini', 'Ramon Santos', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_002_2025_2026;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2025_2026, 'FIL', 'Filipino', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2025_2026, 'ENG', 'English', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2025_2026, 'MATH', 'Mathematics', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2025_2026, 'SCI', 'Science', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2025_2026, 'AP', 'Araling Panlipunan', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2025_2026, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2025_2026, 'TLE', 'Technology and Livelihood Education (TLE)', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2025_2026, 'MAPEH', 'MAPEH', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2025_2026, 'MUSIC_ARTS', 'Music and Arts', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_002_2025_2026, 'PE_HEALTH', 'Physical Education and Health', 92, 93, 94, 95, 94);
END $$;

DO $$ DECLARE ayr_2026_003_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-003', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_003_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2023_2024, 'FIL', 'Filipino', 88, 89, 90, 91, 90);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2023_2024, 'ENG', 'English', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2023_2024, 'MATH', 'Mathematics', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2023_2024, 'SCI', 'Science', 88, 89, 90, 91, 90);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2023_2024, 'AP', 'Araling Panlipunan', 88, 89, 90, 91, 90);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2023_2024, 'MAPEH', 'MAPEH', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 91, 92, 93, 94, 93);
END $$;

DO $$ DECLARE ayr_2026_003_2024_2025 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-003', '2024-2025', 'Grade 8'::grade_level_type, 'Bonifacio', 'Liza Fernandez', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_003_2024_2025;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2024_2025, 'FIL', 'Filipino', 88, 89, 90, 91, 90);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2024_2025, 'ENG', 'English', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2024_2025, 'MATH', 'Mathematics', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2024_2025, 'SCI', 'Science', 88, 89, 90, 91, 90);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2024_2025, 'AP', 'Araling Panlipunan', 88, 89, 90, 91, 90);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2024_2025, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2024_2025, 'TLE', 'Technology and Livelihood Education (TLE)', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2024_2025, 'MAPEH', 'MAPEH', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2024_2025, 'MUSIC_ARTS', 'Music and Arts', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2024_2025, 'PE_HEALTH', 'Physical Education and Health', 91, 92, 93, 94, 93);
END $$;

DO $$ DECLARE ayr_2026_003_2025_2026 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-003', '2025-2026', 'Grade 9'::grade_level_type, 'Mabini', 'Ramon Santos', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_003_2025_2026;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2025_2026, 'FIL', 'Filipino', 88, 89, 90, 91, 90);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2025_2026, 'ENG', 'English', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2025_2026, 'MATH', 'Mathematics', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2025_2026, 'SCI', 'Science', 88, 89, 90, 91, 90);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2025_2026, 'AP', 'Araling Panlipunan', 88, 89, 90, 91, 90);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2025_2026, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2025_2026, 'TLE', 'Technology and Livelihood Education (TLE)', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2025_2026, 'MAPEH', 'MAPEH', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2025_2026, 'MUSIC_ARTS', 'Music and Arts', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_003_2025_2026, 'PE_HEALTH', 'Physical Education and Health', 91, 92, 93, 94, 93);
END $$;

DO $$ DECLARE ayr_2026_004_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-004', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_004_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2023_2024, 'FIL', 'Filipino', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2023_2024, 'ENG', 'English', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2023_2024, 'MATH', 'Mathematics', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2023_2024, 'SCI', 'Science', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2023_2024, 'AP', 'Araling Panlipunan', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2023_2024, 'MAPEH', 'MAPEH', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 90, 91, 92, 93, 92);
END $$;

DO $$ DECLARE ayr_2026_004_2024_2025 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-004', '2024-2025', 'Grade 8'::grade_level_type, 'Bonifacio', 'Liza Fernandez', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_004_2024_2025;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2024_2025, 'FIL', 'Filipino', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2024_2025, 'ENG', 'English', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2024_2025, 'MATH', 'Mathematics', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2024_2025, 'SCI', 'Science', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2024_2025, 'AP', 'Araling Panlipunan', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2024_2025, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2024_2025, 'TLE', 'Technology and Livelihood Education (TLE)', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2024_2025, 'MAPEH', 'MAPEH', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2024_2025, 'MUSIC_ARTS', 'Music and Arts', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2024_2025, 'PE_HEALTH', 'Physical Education and Health', 90, 91, 92, 93, 92);
END $$;

DO $$ DECLARE ayr_2026_004_2025_2026 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-004', '2025-2026', 'Grade 9'::grade_level_type, 'Mabini', 'Ramon Santos', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_004_2025_2026;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2025_2026, 'FIL', 'Filipino', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2025_2026, 'ENG', 'English', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2025_2026, 'MATH', 'Mathematics', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2025_2026, 'SCI', 'Science', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2025_2026, 'AP', 'Araling Panlipunan', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2025_2026, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2025_2026, 'TLE', 'Technology and Livelihood Education (TLE)', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2025_2026, 'MAPEH', 'MAPEH', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2025_2026, 'MUSIC_ARTS', 'Music and Arts', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_004_2025_2026, 'PE_HEALTH', 'Physical Education and Health', 90, 91, 92, 93, 92);
END $$;

DO $$ DECLARE ayr_2026_005_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-005', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_005_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2023_2024, 'FIL', 'Filipino', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2023_2024, 'ENG', 'English', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2023_2024, 'MATH', 'Mathematics', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2023_2024, 'SCI', 'Science', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2023_2024, 'AP', 'Araling Panlipunan', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2023_2024, 'MAPEH', 'MAPEH', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 89, 90, 91, 92, 91);
END $$;

DO $$ DECLARE ayr_2026_005_2024_2025 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-005', '2024-2025', 'Grade 8'::grade_level_type, 'Bonifacio', 'Liza Fernandez', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_005_2024_2025;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2024_2025, 'FIL', 'Filipino', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2024_2025, 'ENG', 'English', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2024_2025, 'MATH', 'Mathematics', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2024_2025, 'SCI', 'Science', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2024_2025, 'AP', 'Araling Panlipunan', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2024_2025, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2024_2025, 'TLE', 'Technology and Livelihood Education (TLE)', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2024_2025, 'MAPEH', 'MAPEH', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2024_2025, 'MUSIC_ARTS', 'Music and Arts', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2024_2025, 'PE_HEALTH', 'Physical Education and Health', 89, 90, 91, 92, 91);
END $$;

DO $$ DECLARE ayr_2026_005_2025_2026 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-005', '2025-2026', 'Grade 9'::grade_level_type, 'Mabini', 'Ramon Santos', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_005_2025_2026;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2025_2026, 'FIL', 'Filipino', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2025_2026, 'ENG', 'English', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2025_2026, 'MATH', 'Mathematics', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2025_2026, 'SCI', 'Science', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2025_2026, 'AP', 'Araling Panlipunan', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2025_2026, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2025_2026, 'TLE', 'Technology and Livelihood Education (TLE)', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2025_2026, 'MAPEH', 'MAPEH', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2025_2026, 'MUSIC_ARTS', 'Music and Arts', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_005_2025_2026, 'PE_HEALTH', 'Physical Education and Health', 89, 90, 91, 92, 91);
END $$;

DO $$ DECLARE ayr_2026_006_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-006', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_006_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2023_2024, 'FIL', 'Filipino', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2023_2024, 'ENG', 'English', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2023_2024, 'MATH', 'Mathematics', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2023_2024, 'SCI', 'Science', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2023_2024, 'AP', 'Araling Panlipunan', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2023_2024, 'MAPEH', 'MAPEH', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 88, 89, 90, 91, 90);
END $$;

DO $$ DECLARE ayr_2026_006_2024_2025 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-006', '2024-2025', 'Grade 8'::grade_level_type, 'Bonifacio', 'Liza Fernandez', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_006_2024_2025;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2024_2025, 'FIL', 'Filipino', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2024_2025, 'ENG', 'English', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2024_2025, 'MATH', 'Mathematics', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2024_2025, 'SCI', 'Science', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2024_2025, 'AP', 'Araling Panlipunan', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2024_2025, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2024_2025, 'TLE', 'Technology and Livelihood Education (TLE)', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2024_2025, 'MAPEH', 'MAPEH', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2024_2025, 'MUSIC_ARTS', 'Music and Arts', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2024_2025, 'PE_HEALTH', 'Physical Education and Health', 88, 89, 90, 91, 90);
END $$;

DO $$ DECLARE ayr_2026_006_2025_2026 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-006', '2025-2026', 'Grade 9'::grade_level_type, 'Mabini', 'Ramon Santos', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_006_2025_2026;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2025_2026, 'FIL', 'Filipino', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2025_2026, 'ENG', 'English', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2025_2026, 'MATH', 'Mathematics', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2025_2026, 'SCI', 'Science', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2025_2026, 'AP', 'Araling Panlipunan', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2025_2026, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2025_2026, 'TLE', 'Technology and Livelihood Education (TLE)', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2025_2026, 'MAPEH', 'MAPEH', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2025_2026, 'MUSIC_ARTS', 'Music and Arts', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_006_2025_2026, 'PE_HEALTH', 'Physical Education and Health', 88, 89, 90, 91, 90);
END $$;

DO $$ DECLARE ayr_2026_007_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-007', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_007_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2023_2024, 'FIL', 'Filipino', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2023_2024, 'ENG', 'English', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2023_2024, 'MATH', 'Mathematics', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2023_2024, 'SCI', 'Science', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2023_2024, 'AP', 'Araling Panlipunan', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2023_2024, 'MAPEH', 'MAPEH', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 87, 88, 89, 90, 89);
END $$;

DO $$ DECLARE ayr_2026_007_2024_2025 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-007', '2024-2025', 'Grade 8'::grade_level_type, 'Bonifacio', 'Liza Fernandez', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_007_2024_2025;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2024_2025, 'FIL', 'Filipino', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2024_2025, 'ENG', 'English', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2024_2025, 'MATH', 'Mathematics', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2024_2025, 'SCI', 'Science', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2024_2025, 'AP', 'Araling Panlipunan', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2024_2025, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2024_2025, 'TLE', 'Technology and Livelihood Education (TLE)', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2024_2025, 'MAPEH', 'MAPEH', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2024_2025, 'MUSIC_ARTS', 'Music and Arts', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2024_2025, 'PE_HEALTH', 'Physical Education and Health', 87, 88, 89, 90, 89);
END $$;

DO $$ DECLARE ayr_2026_007_2025_2026 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-007', '2025-2026', 'Grade 9'::grade_level_type, 'Mabini', 'Ramon Santos', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_007_2025_2026;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2025_2026, 'FIL', 'Filipino', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2025_2026, 'ENG', 'English', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2025_2026, 'MATH', 'Mathematics', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2025_2026, 'SCI', 'Science', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2025_2026, 'AP', 'Araling Panlipunan', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2025_2026, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2025_2026, 'TLE', 'Technology and Livelihood Education (TLE)', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2025_2026, 'MAPEH', 'MAPEH', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2025_2026, 'MUSIC_ARTS', 'Music and Arts', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_007_2025_2026, 'PE_HEALTH', 'Physical Education and Health', 87, 88, 89, 90, 89);
END $$;

DO $$ DECLARE ayr_2026_008_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-008', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_008_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_008_2023_2024, 'FIL', 'Filipino', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_008_2023_2024, 'ENG', 'English', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_008_2023_2024, 'MATH', 'Mathematics', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_008_2023_2024, 'SCI', 'Science', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_008_2023_2024, 'AP', 'Araling Panlipunan', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_008_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_008_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 95, 80, 81, 82, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_008_2023_2024, 'MAPEH', 'MAPEH', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_008_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_008_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 86, 87, 88, 89, 88);
END $$;

DO $$ DECLARE ayr_2026_009_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-009', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_009_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_009_2023_2024, 'FIL', 'Filipino', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_009_2023_2024, 'ENG', 'English', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_009_2023_2024, 'MATH', 'Mathematics', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_009_2023_2024, 'SCI', 'Science', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_009_2023_2024, 'AP', 'Araling Panlipunan', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_009_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_009_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_009_2023_2024, 'MAPEH', 'MAPEH', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_009_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_009_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 85, 86, 87, 88, 87);
END $$;

DO $$ DECLARE ayr_2026_010_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-010', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_010_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_010_2023_2024, 'FIL', 'Filipino', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_010_2023_2024, 'ENG', 'English', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_010_2023_2024, 'MATH', 'Mathematics', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_010_2023_2024, 'SCI', 'Science', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_010_2023_2024, 'AP', 'Araling Panlipunan', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_010_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_010_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 88, 89, 90, 91, 90);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_010_2023_2024, 'MAPEH', 'MAPEH', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_010_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_010_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 95, 80, 81, 82, 85);
END $$;

DO $$ DECLARE ayr_2026_011_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-011', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_011_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_011_2023_2024, 'FIL', 'Filipino', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_011_2023_2024, 'ENG', 'English', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_011_2023_2024, 'MATH', 'Mathematics', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_011_2023_2024, 'SCI', 'Science', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_011_2023_2024, 'AP', 'Araling Panlipunan', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_011_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 82, 83, 84, 85, 84);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_011_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_011_2023_2024, 'MAPEH', 'MAPEH', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_011_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_011_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 94, 95, 80, 81, 88);
END $$;

DO $$ DECLARE ayr_2026_012_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-012', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_012_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_012_2023_2024, 'FIL', 'Filipino', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_012_2023_2024, 'ENG', 'English', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_012_2023_2024, 'MATH', 'Mathematics', 93, 94, 95, 80, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_012_2023_2024, 'SCI', 'Science', 90, 91, 92, 93, 92);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_012_2023_2024, 'AP', 'Araling Panlipunan', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_012_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 81, 82, 83, 84, 83);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_012_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 86, 87, 88, 89, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_012_2023_2024, 'MAPEH', 'MAPEH', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_012_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 91, 92, 93, 94, 93);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_012_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 93, 94, 95, 80, 91);
END $$;

DO $$ DECLARE ayr_2026_013_2023_2024 uuid;
BEGIN
  INSERT INTO academic_year_records (student_id, school_year_id, grade_level, section, adviser_name, school_name, school_dep_id, district, division, region, is_locked)
  VALUES ('2026-013', '2023-2024', 'Grade 7'::grade_level_type, 'Rizal', 'Edgar Cruz', 'Bagong Pag-asa National High School', '301234', 'Quezon City District IV', 'Schools Division Office – Quezon City', 'National Capital Region (NCR)', true)
  RETURNING id INTO ayr_2026_013_2023_2024;
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_013_2023_2024, 'FIL', 'Filipino', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_013_2023_2024, 'ENG', 'English', 84, 85, 86, 87, 86);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_013_2023_2024, 'MATH', 'Mathematics', 94, 95, 80, 81, 88);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_013_2023_2024, 'SCI', 'Science', 89, 90, 91, 92, 91);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_013_2023_2024, 'AP', 'Araling Panlipunan', 87, 88, 89, 90, 89);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_013_2023_2024, 'ESP', 'Edukasyon sa Pagpapakatao (ESP)', 80, 81, 82, 83, 82);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_013_2023_2024, 'TLE', 'Technology and Livelihood Education (TLE)', 85, 86, 87, 88, 87);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_013_2023_2024, 'MAPEH', 'MAPEH', 83, 84, 85, 86, 85);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_013_2023_2024, 'MUSIC_ARTS', 'Music and Arts', 92, 93, 94, 95, 94);
  INSERT INTO academic_year_subject_grades (academic_year_record_id, subject_id, subject_name, quarter1, quarter2, quarter3, quarter4, final_grade)
  VALUES (ayr_2026_013_2023_2024, 'PE_HEALTH', 'Physical Education and Health', 92, 93, 94, 95, 94);
END $$;

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
--   schools: 1 | school_years: 4 | subjects: 10
--   teachers: 4 | classes: 4 | teaching_assignments: 40
--   students: 19 | grade_records: 190
--   academic history: 27 year records
-- =============================================================================
