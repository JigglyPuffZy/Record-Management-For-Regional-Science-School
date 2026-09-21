-- =============================================================================
-- REMOVE ALL DUMMY DATA + CREATE 1 TEACHER ACCOUNT
--
-- Run this in Supabase Dashboard → SQL Editor (after full_schema.sql).
-- Keeps: school, school years, subjects, curriculum (reference data).
-- Removes: all demo students, teachers, classes, grades, academic history.
-- Creates: ONE admin teacher with full Grade 10 class access.
--
-- TEACHER LOGIN (use in the app):
--   Teacher ID : T-ADMIN
--   Email      : admin@bpans.edu.ph
--   Password   : Bpans@2026
-- =============================================================================

BEGIN;

-- 1. Remove all transactional / dummy data (order respects foreign keys)
DELETE FROM remedial_classes;
DELETE FROM academic_year_subject_grades;
DELETE FROM academic_year_records;
DELETE FROM grade_records;
DELETE FROM students;
DELETE FROM teaching_assignments;
DELETE FROM classes;
DELETE FROM teachers;

-- 2. Single teacher account
INSERT INTO teachers (teacher_id, name, email, position, demo_password)
VALUES (
  'T-ADMIN',
  'Maria Santos',
  'admin@bpans.edu.ph',
  'Teacher III — System Administrator',
  'Bpans@2026'
);

-- 3. One class section (Grade 10, current SY) — adviser is the admin teacher
INSERT INTO classes (id, school_id, school_year_id, grade_level, section, adviser_teacher_id)
VALUES (
  'G10-RIZAL',
  (SELECT id FROM schools LIMIT 1),
  '2026-2027',
  'Grade 10',
  'Rizal',
  'T-ADMIN'
);

-- 4. Teaching assignments — all subjects for Grade 10 Rizal
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, school_year_id)
SELECT 'T-ADMIN', 'G10-RIZAL', s.id, '2026-2027'
FROM subjects s
WHERE s.is_active = true
ORDER BY s.sort_order;

COMMIT;

-- -----------------------------------------------------------------------------
-- Verify (optional — check results after run)
-- -----------------------------------------------------------------------------
SELECT 'teachers' AS table_name, count(*) AS rows FROM teachers
UNION ALL SELECT 'students', count(*) FROM students
UNION ALL SELECT 'classes', count(*) FROM classes
UNION ALL SELECT 'grade_records', count(*) FROM grade_records
UNION ALL SELECT 'teaching_assignments', count(*) FROM teaching_assignments;

-- Test login (should return 1 row):
-- SELECT * FROM login_teacher('T-ADMIN', 'Bpans@2026');
-- SELECT * FROM login_teacher('admin@bpans.edu.ph', 'Bpans@2026');
