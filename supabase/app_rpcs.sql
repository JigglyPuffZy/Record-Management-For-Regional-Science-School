-- =============================================================================
-- App write RPCs (run once in Supabase SQL Editor after full_schema.sql)
-- Allows the browser app (anon key) to create students and save grades.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_student_account(
  p_lrn text,
  p_last_name text,
  p_first_name text,
  p_middle_name text DEFAULT '',
  p_name_extension text DEFAULT '',
  p_birthdate date,
  p_sex sex_type,
  p_class_id text,
  p_password text
)
RETURNS TABLE(
  student_id text,
  display_name text,
  lrn text,
  class_id text,
  last_name text,
  first_name text,
  middle_name text,
  name_extension text,
  sex sex_type,
  birthdate date,
  status student_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id text;
  v_display_name text;
  v_grade_level grade_level_type;
  v_school_year text;
  v_seq int;
BEGIN
  IF trim(coalesce(p_lrn, '')) = '' THEN
    RAISE EXCEPTION 'LRN is required';
  END IF;
  IF EXISTS (SELECT 1 FROM students s WHERE s.lrn = trim(p_lrn)) THEN
    RAISE EXCEPTION 'An account with this LRN already exists';
  END IF;
  IF trim(coalesce(p_last_name, '')) = '' OR trim(coalesce(p_first_name, '')) = '' THEN
    RAISE EXCEPTION 'Last name and first name are required';
  END IF;
  IF length(coalesce(p_password, '')) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  SELECT c.grade_level, c.school_year_id
  INTO v_grade_level, v_school_year
  FROM classes c
  WHERE c.id = p_class_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  SELECT coalesce(max((regexp_match(s.student_id, '^2026-(\d+)$'))[1]::int), 0) + 1
  INTO v_seq
  FROM students s
  WHERE s.student_id ~ '^2026-\d+$';

  v_student_id := '2026-' || lpad(v_seq::text, 3, '0');

  v_display_name := trim(
    p_first_name || ' ' ||
    CASE WHEN coalesce(trim(p_middle_name), '') <> '' THEN trim(p_middle_name) || ' ' ELSE '' END ||
    p_last_name ||
    CASE WHEN coalesce(trim(p_name_extension), '') <> '' THEN ' ' || trim(p_name_extension) ELSE '' END
  );

  INSERT INTO students (
    student_id, lrn, last_name, first_name, middle_name, name_extension,
    display_name, sex, birthdate, class_id, status, demo_password
  )
  VALUES (
    v_student_id, trim(p_lrn), trim(p_last_name), trim(p_first_name),
    coalesce(trim(p_middle_name), ''), coalesce(trim(p_name_extension), ''),
    v_display_name, p_sex, p_birthdate, p_class_id, 'Active', p_password
  );

  INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, status)
  SELECT v_student_id, p_class_id, ta.subject_id, v_school_year, v_grade_level, 'draft'
  FROM teaching_assignments ta
  WHERE ta.class_id = p_class_id AND ta.school_year_id = v_school_year
  ON CONFLICT (student_id, class_id, subject_id, school_year_id) DO NOTHING;

  RETURN QUERY
  SELECT
    s.student_id, s.display_name, s.lrn, s.class_id,
    s.last_name, s.first_name, s.middle_name, s.name_extension,
    s.sex, s.birthdate, s.status
  FROM students s
  WHERE s.student_id = v_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION save_grade_record(
  p_student_id text,
  p_class_id text,
  p_subject_id text,
  p_school_year_id text,
  p_field text,
  p_value numeric,
  p_updated_by text DEFAULT NULL
)
RETURNS TABLE(
  student_id text,
  class_id text,
  subject_id text,
  school_year_id text,
  grade_level grade_level_type,
  quarter1 numeric,
  quarter2 numeric,
  quarter3 numeric,
  quarter4 numeric,
  final_grade smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grade_level grade_level_type;
BEGIN
  IF p_field NOT IN ('quarter1', 'quarter2', 'quarter3', 'quarter4') THEN
    RAISE EXCEPTION 'Invalid grading period';
  END IF;
  IF p_value IS NOT NULL AND (p_value < 0 OR p_value > 100) THEN
    RAISE EXCEPTION 'Invalid grade. Please enter a value from 0 to 100.';
  END IF;

  SELECT c.grade_level INTO v_grade_level FROM classes c WHERE c.id = p_class_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  INSERT INTO grade_records (student_id, class_id, subject_id, school_year_id, grade_level, updated_by)
  VALUES (p_student_id, p_class_id, p_subject_id, p_school_year_id, v_grade_level, p_updated_by)
  ON CONFLICT (student_id, class_id, subject_id, school_year_id) DO NOTHING;

  UPDATE grade_records gr SET
    quarter1 = CASE WHEN p_field = 'quarter1' THEN p_value ELSE gr.quarter1 END,
    quarter2 = CASE WHEN p_field = 'quarter2' THEN p_value ELSE gr.quarter2 END,
    quarter3 = CASE WHEN p_field = 'quarter3' THEN p_value ELSE gr.quarter3 END,
    quarter4 = CASE WHEN p_field = 'quarter4' THEN p_value ELSE gr.quarter4 END,
    updated_by = coalesce(p_updated_by, gr.updated_by)
  WHERE gr.student_id = p_student_id
    AND gr.class_id = p_class_id
    AND gr.subject_id = p_subject_id
    AND gr.school_year_id = p_school_year_id;

  RETURN QUERY
  SELECT
    gr.student_id, gr.class_id, gr.subject_id, gr.school_year_id, gr.grade_level,
    gr.quarter1, gr.quarter2, gr.quarter3, gr.quarter4, gr.final_grade
  FROM grade_records gr
  WHERE gr.student_id = p_student_id
    AND gr.class_id = p_class_id
    AND gr.subject_id = p_subject_id
    AND gr.school_year_id = p_school_year_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_student_account(text, text, text, text, text, date, sex_type, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_grade_record(text, text, text, text, text, numeric, text) TO anon, authenticated;

-- Direct table access fallback (used if RPCs unavailable)
GRANT INSERT, UPDATE ON students TO anon;
GRANT INSERT, UPDATE ON grade_records TO anon;

DROP POLICY IF EXISTS students_anon_insert ON students;
CREATE POLICY students_anon_insert ON students FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS grade_records_anon_insert ON grade_records;
CREATE POLICY grade_records_anon_insert ON grade_records FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS grade_records_anon_update ON grade_records;
CREATE POLICY grade_records_anon_update ON grade_records FOR UPDATE TO anon USING (true) WITH CHECK (true);
