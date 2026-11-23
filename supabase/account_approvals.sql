-- STANDALONE SETUP / UPGRADE for Supabase SQL Editor.
-- Creates missing base tables before adding registration approvals.
-- Preserves existing records; never run full_schema.sql or cleanup scripts as a repair.
-- Use the same Supabase project configured in the application's environment.
BEGIN;
SET LOCAL search_path = public, extensions;
CREATE EXTENSION IF NOT EXISTS citext;

-- Stop rather than create a parallel school database in the wrong schema.
DO $$
BEGIN
  IF to_regclass('public.teachers') IS NULL AND EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'teachers' AND c.relkind IN ('r', 'p')
      AND n.nspname NOT IN ('public', 'pg_catalog', 'information_schema')
  ) THEN
    RAISE EXCEPTION 'A teachers table exists in another schema. Confirm the correct project/schema before running setup.';
  END IF;
END $$;

-- Create only missing enum types and base tables.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('student', 'teacher');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'sex_type') THEN
    CREATE TYPE public.sex_type AS ENUM ('Male', 'Female');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'student_status') THEN
    CREATE TYPE public.student_status AS ENUM ('Active', 'Inactive', 'Transferred', 'Graduated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'grade_level_type') THEN
    CREATE TYPE public.grade_level_type AS ENUM ('Grade 7', 'Grade 8', 'Grade 9', 'Grade 10');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'curriculum_scale') THEN
    CREATE TYPE public.curriculum_scale AS ENUM ('jhs', 'grade10');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'grade_record_status') THEN
    CREATE TYPE public.grade_record_status AS ENUM ('draft', 'finalized', 'archived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.schools (
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

CREATE TABLE IF NOT EXISTS public.school_years (
  id text PRIMARY KEY,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  sort_order smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  sort_order smallint NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.curriculum_configs (
  grade_level grade_level_type PRIMARY KEY,
  scale curriculum_scale NOT NULL,
  final_label text NOT NULL DEFAULT 'Final Rating',
  term_count smallint NOT NULL CHECK (term_count IN (3, 4)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level grade_level_type NOT NULL REFERENCES public.curriculum_configs(grade_level) ON DELETE CASCADE,
  period_id text NOT NULL,
  label text NOT NULL,
  storage_field text NOT NULL,
  sort_order smallint NOT NULL,
  UNIQUE (grade_level, period_id),
  UNIQUE (grade_level, storage_field)
);

CREATE TABLE IF NOT EXISTS public.teachers (
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

CREATE TABLE IF NOT EXISTS public.classes (
  id text PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  school_year_id text NOT NULL REFERENCES public.school_years(id) ON DELETE RESTRICT,
  grade_level grade_level_type NOT NULL,
  section text NOT NULL,
  adviser_teacher_id text REFERENCES public.teachers(teacher_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grade_level, section, school_year_id)
);

CREATE TABLE IF NOT EXISTS public.teaching_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text NOT NULL REFERENCES public.teachers(teacher_id) ON DELETE CASCADE,
  class_id text NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  school_year_id text NOT NULL REFERENCES public.school_years(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id, subject_id, school_year_id)
);

CREATE TABLE IF NOT EXISTS public.students (
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
  class_id text NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  status student_status NOT NULL DEFAULT 'Active',
  demo_password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grade_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  class_id text NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  subject_id text NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  school_year_id text NOT NULL REFERENCES public.school_years(id) ON DELETE RESTRICT,
  grade_level grade_level_type NOT NULL,
  quarter1 numeric(5,1) CHECK (quarter1 IS NULL OR (quarter1 >= 0 AND quarter1 <= 100)),
  quarter2 numeric(5,1) CHECK (quarter2 IS NULL OR (quarter2 >= 0 AND quarter2 <= 100)),
  quarter3 numeric(5,1) CHECK (quarter3 IS NULL OR (quarter3 >= 0 AND quarter3 <= 100)),
  quarter4 numeric(5,1) CHECK (quarter4 IS NULL OR (quarter4 >= 0 AND quarter4 <= 100)),
  final_grade smallint,
  status grade_record_status NOT NULL DEFAULT 'draft',
  updated_by text REFERENCES public.teachers(teacher_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_id, subject_id, school_year_id)
);

CREATE TABLE IF NOT EXISTS public.academic_year_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  school_year_id text NOT NULL REFERENCES public.school_years(id) ON DELETE RESTRICT,
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

CREATE TABLE IF NOT EXISTS public.academic_year_subject_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_record_id uuid NOT NULL REFERENCES public.academic_year_records(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  subject_name text NOT NULL,
  quarter1 smallint NOT NULL,
  quarter2 smallint NOT NULL,
  quarter3 smallint NOT NULL,
  quarter4 smallint NOT NULL,
  final_grade smallint NOT NULL,
  UNIQUE (academic_year_record_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.remedial_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_record_id uuid NOT NULL REFERENCES public.academic_year_records(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  learning_area text NOT NULL,
  final_rating smallint NOT NULL,
  remedial_class_mark smallint NOT NULL,
  recomputed_final_grade smallint NOT NULL,
  conducted_from date NOT NULL,
  conducted_to date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  display_name text NOT NULL,
  linked_student_id text REFERENCES public.students(student_id) ON DELETE SET NULL,
  linked_teacher_id text REFERENCES public.teachers(teacher_id) ON DELETE SET NULL,
  email_notifications boolean NOT NULL DEFAULT true,
  save_confirm boolean NOT NULL DEFAULT true,
  grade_alerts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_school_year ON classes(school_year_id);
CREATE INDEX IF NOT EXISTS idx_classes_adviser ON classes(adviser_teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade_level ON classes(grade_level, school_year_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_grade_records_student_sy ON grade_records(student_id, school_year_id);
CREATE INDEX IF NOT EXISTS idx_grade_records_class_subject_sy ON grade_records(class_id, subject_id, school_year_id);
CREATE INDEX IF NOT EXISTS idx_ta_teacher ON teaching_assignments(teacher_id, school_year_id);
CREATE INDEX IF NOT EXISTS idx_ta_class ON teaching_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_ayr_student ON academic_year_records(student_id, school_year_id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_school_year ON school_years(is_active) WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.recompute_grade_record_final()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.grade_level = 'Grade 10' THEN
    NEW.final_grade := CASE WHEN NEW.quarter1 IS NULL OR NEW.quarter2 IS NULL OR NEW.quarter3 IS NULL THEN NULL
      ELSE round((NEW.quarter1 + NEW.quarter2 + NEW.quarter3) / 3.0)::smallint END;
  ELSE
    NEW.final_grade := CASE WHEN NEW.quarter1 IS NULL OR NEW.quarter2 IS NULL OR NEW.quarter3 IS NULL OR NEW.quarter4 IS NULL THEN NULL
      ELSE round((NEW.quarter1 + NEW.quarter2 + NEW.quarter3 + NEW.quarter4) / 4.0)::smallint END;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['schools', 'teachers', 'students', 'grade_records', 'user_profiles'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = ('public.' || table_name)::regclass AND tgname = 'trg_' || table_name || '_updated' AND NOT tgisinternal) THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', 'trg_' || table_name || '_updated', table_name);
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.grade_records'::regclass AND tgname = 'trg_grade_records_final' AND NOT tgisinternal) THEN
    CREATE TRIGGER trg_grade_records_final BEFORE INSERT OR UPDATE ON public.grade_records
      FOR EACH ROW EXECUTE FUNCTION public.recompute_grade_record_final();
  END IF;
END $$;

-- Fill missing reference records. Existing values are not overwritten.
INSERT INTO public.schools (school_id, name, district, address, division, region)
SELECT 'UNCONFIGURED-RSHS-II', 'Regional Science High School for Region II',
  'Not yet configured', 'Not yet configured', 'Not yet configured', 'Region II'
WHERE NOT EXISTS (SELECT 1 FROM public.schools)
ON CONFLICT DO NOTHING;

INSERT INTO public.school_years (id, label, is_active, sort_order) VALUES
  ('2026-2027', '2026-2027', NOT EXISTS (SELECT 1 FROM public.school_years WHERE is_active), 4),
  ('2025-2026', '2025-2026', false, 3),
  ('2024-2025', '2024-2025', false, 2),
  ('2023-2024', '2023-2024', false, 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.subjects (id, name, sort_order) VALUES
  ('FIL', 'Filipino', 1), ('ENG', 'English', 2), ('MATH', 'Mathematics', 3),
  ('SCI', 'Science', 4), ('AP', 'Araling Panlipunan', 5),
  ('ESP', 'Edukasyon sa Pagpapakatao (ESP)', 6),
  ('TLE', 'Technology and Livelihood Education (TLE)', 7), ('MAPEH', 'MAPEH', 8),
  ('MUSIC_ARTS', 'Music and Arts', 9), ('PE_HEALTH', 'Physical Education and Health', 10),
  ('CREATIVE_TECH', 'Creative Tech', 11), ('RESEARCH', 'Research', 12)
ON CONFLICT DO NOTHING;

INSERT INTO public.curriculum_configs (grade_level, scale, final_label, term_count) VALUES
  ('Grade 7', 'jhs', 'Final Rating', 4), ('Grade 8', 'jhs', 'Final Rating', 4),
  ('Grade 9', 'jhs', 'Final Rating', 4), ('Grade 10', 'grade10', 'Final Rating', 3)
ON CONFLICT DO NOTHING;
INSERT INTO public.curriculum_periods (grade_level, period_id, label, storage_field, sort_order)
SELECT c.grade_level, 'term' || n, 'Term ' || n, 'quarter' || n, n
FROM public.curriculum_configs c CROSS JOIN LATERAL generate_series(1, c.term_count) n
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.app_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  identifier text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.app_accounts(id),
  review_note text NOT NULL DEFAULT ''
);
ALTER TABLE public.app_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_accounts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_accounts TO service_role;

-- Bootstrap an administrator only when none exists; preserve all teacher records.
-- No shared/default password: the generated password is returned at the end.
CREATE TEMP TABLE IF NOT EXISTS sf10_setup_credentials (
  admin_id text, email text, temporary_password text
) ON COMMIT PRESERVE ROWS;
TRUNCATE pg_temp.sf10_setup_credentials;
WITH created_admin AS (
  INSERT INTO public.teachers (teacher_id, name, email, position, demo_password)
  SELECT 'T-ADMIN', 'School Administrator', 'admin@rshs2.local', 'System Administrator',
    replace(gen_random_uuid()::text, '-', '')
  WHERE NOT EXISTS (SELECT 1 FROM public.teachers WHERE teacher_id = 'T-ADMIN')
    AND NOT EXISTS (SELECT 1 FROM public.app_accounts WHERE role = 'admin' AND status = 'approved')
  ON CONFLICT DO NOTHING
  RETURNING teacher_id, email, demo_password
)
INSERT INTO pg_temp.sf10_setup_credentials
SELECT teacher_id, email::text, demo_password FROM created_admin;

INSERT INTO public.classes (id, school_id, school_year_id, grade_level, section, adviser_teacher_id)
SELECT 'G10-RIZAL', s.id, sy.id, 'Grade 10', 'Rizal',
  (SELECT teacher_id FROM public.teachers WHERE teacher_id = 'T-ADMIN')
FROM public.schools s CROSS JOIN public.school_years sy
WHERE sy.is_active AND NOT EXISTS (SELECT 1 FROM public.classes)
ORDER BY s.created_at LIMIT 1
ON CONFLICT DO NOTHING;

-- Lock down all base tables; the app accesses them through its server APIs.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'schools', 'school_years', 'subjects', 'curriculum_configs', 'curriculum_periods',
    'teachers', 'classes', 'teaching_assignments', 'students', 'grade_records',
    'academic_year_records', 'academic_year_subject_grades', 'remedial_classes', 'user_profiles'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA public TO service_role;

-- Registration accounts and approval workflow.
-- Existing system administrator now signs in through Admin, never through Teacher.
INSERT INTO public.app_accounts (role, identifier, email, name, status, linked_id, review_note)
SELECT CASE WHEN teacher_id = 'T-ADMIN' THEN 'admin' ELSE 'teacher' END,
  lower(teacher_id), lower(email::text), name, 'approved', teacher_id, 'Existing school account migrated'
FROM public.teachers ON CONFLICT DO NOTHING;
INSERT INTO public.app_accounts (role, identifier, email, name, status, linked_id, review_note)
SELECT 'student', lrn, lrn || '@legacy.invalid', display_name, 'approved', student_id, 'Existing school account migrated'
FROM public.students ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_accounts WHERE role = 'admin' AND status = 'approved') THEN
    RAISE EXCEPTION 'No administrator account could be created. Check for conflicting T-ADMIN identifiers or admin@rshs2.local email before retrying.';
  END IF;
END $$;

-- Sensitive data and write functions are accessible only through verified server APIs.
REVOKE ALL ON public.students, public.teachers, public.grade_records,
  public.teaching_assignments, public.academic_year_records,
  public.academic_year_subject_grades, public.remedial_classes,
  public.user_profiles FROM anon, authenticated;
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('login_student', 'login_teacher', 'create_student_account', 'save_grade_record', 'exec', 'exec_sql')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.review_registration(
  p_admin uuid, p_account uuid, p_decision text, p_note text,
  p_class_id text DEFAULT NULL, p_subject_ids text[] DEFAULT '{}'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  applicant public.app_accounts%ROWTYPE;
  cls public.classes%ROWTYPE;
  new_id text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app_accounts WHERE id = p_admin AND role = 'admin' AND status = 'approved') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;
  SELECT * INTO applicant FROM app_accounts WHERE id = p_account FOR UPDATE;
  IF NOT FOUND OR applicant.status <> 'pending' OR applicant.role = 'admin' THEN
    RAISE EXCEPTION 'This registration is no longer pending. Refresh the list.';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') OR length(trim(coalesce(p_note, ''))) = 0 THEN
    RAISE EXCEPTION 'A decision and verification note are required';
  END IF;
  IF p_decision = 'approved' THEN
    SELECT c.* INTO cls FROM classes c JOIN school_years sy ON sy.id = c.school_year_id
    WHERE c.id = p_class_id AND sy.is_active FOR UPDATE OF c;
    IF NOT FOUND THEN RAISE EXCEPTION 'Choose a class in the active school year'; END IF;
    IF applicant.role = 'teacher' THEN
      IF coalesce(array_length(p_subject_ids, 1), 0) = 0 OR EXISTS (
        SELECT 1 FROM unnest(p_subject_ids) s WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE id = s AND is_active)
      ) THEN RAISE EXCEPTION 'Select valid teaching subjects'; END IF;
      IF EXISTS (SELECT 1 FROM teaching_assignments ta JOIN app_accounts a ON a.linked_id = ta.teacher_id
        WHERE a.role = 'teacher' AND a.status = 'approved' AND ta.class_id = cls.id AND ta.subject_id = ANY(p_subject_ids)
        AND ta.school_year_id = cls.school_year_id) THEN
        RAISE EXCEPTION 'A selected subject already has an approved teacher in this class';
      END IF;
      new_id := upper(applicant.identifier);
      INSERT INTO teachers (teacher_id, name, email, position)
      VALUES (new_id, applicant.name, applicant.email, coalesce(applicant.details->>'position', 'Teacher'));
      INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
      SELECT new_id, cls.id, s, cls.school_year_id FROM unnest(p_subject_ids) s;
      -- The old administrator is no longer a teaching account.
      DELETE FROM teaching_assignments WHERE teacher_id = 'T-ADMIN' AND class_id = cls.id AND subject_id = ANY(p_subject_ids);
    ELSE
      new_id := 'S-' || applicant.identifier;
      INSERT INTO students (student_id, lrn, last_name, first_name, middle_name, display_name, sex, birthdate, class_id, status)
      VALUES (new_id, applicant.identifier, applicant.details->>'lastName', applicant.details->>'firstName',
        coalesce(applicant.details->>'middleName', ''), applicant.name,
        (applicant.details->>'sex')::sex_type, (applicant.details->>'birthdate')::date, cls.id, 'Active');
      INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level)
      SELECT new_id, cls.id, s.id, cls.school_year_id, cls.grade_level FROM subjects s WHERE s.is_active;
    END IF;
  END IF;
  UPDATE app_accounts SET status = p_decision, linked_id = coalesce(new_id, linked_id),
    details = CASE WHEN p_decision = 'approved' THEN details || jsonb_build_object('approvedClassId', p_class_id, 'approvedSubjectIds', p_subject_ids) ELSE details END,
    reviewed_at = now(), reviewed_by = p_admin, review_note = trim(p_note)
  WHERE id = p_account;
END $$;
REVOKE ALL ON FUNCTION public.review_registration(uuid, uuid, text, text, text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_registration(uuid, uuid, text, text, text, text[]) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Save this generated password if a new admin was created.
-- Empty results mean no password was created or changed.
SELECT admin_id, email, temporary_password FROM pg_temp.sf10_setup_credentials;
