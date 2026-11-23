-- Run ONLY in the accidental project: muritrmyuhodjzqvhczh.
-- Permanently removes the 15 school-system tables and their rows.
-- No CASCADE: dependencies from other tables cause a rollback instead of deleting them.
BEGIN;

DROP FUNCTION IF EXISTS public.review_registration(uuid, uuid, text, text, text, text[]);

DROP TABLE IF EXISTS
  public.remedial_classes,
  public.academic_year_subject_grades,
  public.academic_year_records,
  public.grade_records,
  public.teaching_assignments,
  public.app_accounts,
  public.user_profiles,
  public.students,
  public.classes,
  public.teachers,
  public.curriculum_periods,
  public.curriculum_configs,
  public.subjects,
  public.school_years,
  public.schools;

DROP FUNCTION IF EXISTS public.recompute_grade_record_final();

-- Shared helpers/types are removed only if no remaining objects depend on them.
-- Keep extensions and auth.users intact.
DO $$
DECLARE type_name text;
BEGIN
  BEGIN
    DROP FUNCTION IF EXISTS public.set_updated_at();
  EXCEPTION WHEN dependent_objects_still_exist THEN
    RAISE NOTICE 'Kept set_updated_at because another object uses it';
  END;
  FOREACH type_name IN ARRAY ARRAY[
    'user_role', 'sex_type', 'student_status',
    'grade_level_type', 'curriculum_scale', 'grade_record_status'
  ] LOOP
    BEGIN
      EXECUTE format('DROP TYPE IF EXISTS public.%I', type_name);
    EXCEPTION WHEN dependent_objects_still_exist THEN
      RAISE NOTICE 'Kept type % because another object uses it', type_name;
    END;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT tablename
FROM pg_catalog.pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
