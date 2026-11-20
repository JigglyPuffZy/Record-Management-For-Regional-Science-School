-- Apply AFTER the existing school schema. Preserves existing learners and grades.
BEGIN;
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
REVOKE ALL ON public.app_accounts FROM anon, authenticated;
GRANT ALL ON public.app_accounts TO service_role;

-- Existing system administrator now signs in through Admin, never through Teacher.
INSERT INTO public.app_accounts (role, identifier, email, name, status, linked_id, review_note)
SELECT CASE WHEN teacher_id = 'T-ADMIN' THEN 'admin' ELSE 'teacher' END,
  lower(teacher_id), lower(email::text), name, 'approved', teacher_id, 'Existing school account migrated'
FROM public.teachers ON CONFLICT DO NOTHING;
INSERT INTO public.app_accounts (role, identifier, email, name, status, linked_id, review_note)
SELECT 'student', lrn, lrn || '@legacy.invalid', display_name, 'approved', student_id, 'Existing school account migrated'
FROM public.students ON CONFLICT DO NOTHING;

-- Sensitive data and write functions are accessible only through verified server APIs.
REVOKE ALL ON public.students, public.teachers, public.grade_records,
  public.teaching_assignments, public.academic_year_records,
  public.academic_year_subject_grades, public.remedial_classes,
  public.user_profiles FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.login_student(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.login_teacher(text, text) FROM PUBLIC, anon, authenticated;
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('create_student_account', 'save_grade_record', 'exec', 'exec_sql')
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
COMMIT;
