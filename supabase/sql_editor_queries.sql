-- =============================================================================
-- SF10 & Class Record — SQL Editor cheat sheet
-- =============================================================================
-- Where: Supabase Dashboard → SQL Editor → New query → paste a section → Run
--
-- App login (teacher):
--   Teacher ID : T-ADMIN
--   Email      : admin@bpans.edu.ph
--   Password   : Bpans@2026
--
-- Note: Written Works / Performance Tasks / Quarterly Assessment scores are
-- stored in the browser (localStorage). Only TERM GRADES are saved in the DB
-- (grade_records.quarter1 … quarter4). Final rating is in grade_records.final_grade.
-- =============================================================================


-- =============================================================================
-- SECTION 1 — Quick health check (safe to run anytime)
-- =============================================================================

SELECT 'schools' AS item, count(*)::text AS count FROM schools
UNION ALL SELECT 'school_years', count(*)::text FROM school_years
UNION ALL SELECT 'subjects', count(*)::text FROM subjects
UNION ALL SELECT 'teachers', count(*)::text FROM teachers
UNION ALL SELECT 'classes', count(*)::text FROM classes
UNION ALL SELECT 'students', count(*)::text FROM students
UNION ALL SELECT 'grade_records', count(*)::text FROM grade_records
UNION ALL SELECT 'teaching_assignments', count(*)::text FROM teaching_assignments;


-- =============================================================================
-- SECTION 2 — Test teacher login (safe to run)
-- =============================================================================

SELECT teacher_id, display_name, email
FROM login_teacher('T-ADMIN', 'Bpans@2026');

-- Or by email:
-- SELECT teacher_id, display_name, email
-- FROM login_teacher('admin@bpans.edu.ph', 'Bpans@2026');


-- =============================================================================
-- SECTION 3 — List students in Grade 10 Rizal (safe to run)
-- =============================================================================

SELECT
  s.student_id,
  s.lrn,
  s.display_name,
  s.sex,
  s.status,
  c.grade_level,
  c.section
FROM students s
JOIN classes c ON c.id = s.class_id
WHERE s.class_id = 'G10-RIZAL'
ORDER BY s.last_name, s.first_name;


-- =============================================================================
-- SECTION 4 — Class record for ONE subject (safe to run)
-- Change subject_id: FIL, ENG, MATH, SCI, AP, ESP, TLE, MAPEH, MUSIC_ARTS, PE_HEALTH
-- =============================================================================

SELECT
  s.lrn,
  s.display_name AS student_name,
  sub.name AS subject,
  gr.school_year_id,
  gr.quarter1 AS term_1_grade,
  gr.quarter2 AS term_2_grade,
  gr.quarter3 AS term_3_grade,
  gr.quarter4 AS term_4_grade,
  gr.final_grade AS final_rating,
  gr.status,
  gr.updated_at
FROM grade_records gr
JOIN students s ON s.student_id = gr.student_id
JOIN subjects sub ON sub.id = gr.subject_id
WHERE gr.school_year_id = '2026-2027'
  AND gr.class_id = 'G10-RIZAL'
  AND gr.subject_id = 'ENG'
ORDER BY s.last_name, s.first_name;


-- =============================================================================
-- SECTION 5 — Full class record grid (all subjects, safe to run)
-- =============================================================================

SELECT
  sub.name AS subject,
  s.display_name AS student,
  gr.quarter1,
  gr.quarter2,
  gr.quarter3,
  gr.quarter4,
  gr.final_grade
FROM grade_records gr
JOIN students s ON s.student_id = gr.student_id
JOIN subjects sub ON sub.id = gr.subject_id
WHERE gr.class_id = 'G10-RIZAL'
  AND gr.school_year_id = '2026-2027'
ORDER BY sub.sort_order, s.last_name, s.first_name;


-- =============================================================================
-- SECTION 6 — Students missing a term grade (safe to run)
-- Grade 10 uses Term 1–3 → quarter1, quarter2, quarter3
-- =============================================================================

SELECT
  s.display_name,
  sub.name AS subject,
  gr.quarter1 AS term_1,
  gr.quarter2 AS term_2,
  gr.quarter3 AS term_3,
  gr.final_grade
FROM grade_records gr
JOIN students s ON s.student_id = gr.student_id
JOIN subjects sub ON sub.id = gr.subject_id
WHERE gr.class_id = 'G10-RIZAL'
  AND gr.school_year_id = '2026-2027'
  AND (gr.quarter1 IS NULL OR gr.quarter2 IS NULL OR gr.quarter3 IS NULL)
ORDER BY sub.name, s.display_name;


-- =============================================================================
-- SECTION 7 — Update admin display name (run once if needed)
-- =============================================================================

-- UPDATE teachers
-- SET name = 'Admin'
-- WHERE teacher_id = 'T-ADMIN';


-- =============================================================================
-- SECTION 8 — Manually set ONE student's term grade (example)
-- Uncomment and edit student_id / subject_id / grade before running.
-- Same effect as clicking Save in the Class Record app.
-- =============================================================================

-- UPDATE grade_records
-- SET
--   quarter1 = 88.5,
--   updated_by = 'T-ADMIN'
-- WHERE student_id = '2026-001'
--   AND class_id = 'G10-RIZAL'
--   AND subject_id = 'ENG'
--   AND school_year_id = '2026-2027';


-- =============================================================================
-- SECTION 9 — Reset to single admin teacher + empty class (DESTRUCTIVE)
-- Use file: supabase/cleanup_single_teacher.sql
-- (Paste and run that entire file — deletes all students & grades, recreates T-ADMIN)
-- =============================================================================


-- =============================================================================
-- SECTION 10 — Optional app write helpers (run once if saves fail from browser)
-- Paste and run the FULL file: supabase/app_rpcs.sql
-- =============================================================================


-- =============================================================================
-- SECTION 11 — Transmutation table SY 2026–2027 (optional function)
-- Paste and run: supabase/transmutation_sy_2026_2027.sql
-- Then test:
-- =============================================================================

-- SELECT transmute_grade_sy_2026_2027(95.50) AS transmuted_grade;
-- SELECT transmute_grade_sy_2026_2027(88.00) AS transmuted_grade;
