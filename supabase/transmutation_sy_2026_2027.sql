-- =============================================================================
-- NEW TRANSMUTATION TABLE — School Year 2026–2027
-- Paste in Supabase SQL Editor (reference + optional lookup function).
-- The app uses the same values in: src/lib/transmutation.js
-- =============================================================================

-- Optional: create a lookup function (run once)
CREATE OR REPLACE FUNCTION transmute_grade_sy_2026_2027(p_initial numeric)
RETURNS smallint
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v numeric;
BEGIN
  IF p_initial IS NULL THEN
    RETURN NULL;
  END IF;
  v := round(p_initial::numeric, 2);

  IF v >= 99.5 AND v <= 100 THEN RETURN 100; END IF;
  IF v >= 98.32 AND v <= 99.49 THEN RETURN 99; END IF;
  IF v >= 97.14 AND v <= 98.31 THEN RETURN 98; END IF;
  IF v >= 95.96 AND v <= 97.13 THEN RETURN 97; END IF;
  IF v >= 94.78 AND v <= 95.95 THEN RETURN 96; END IF;
  IF v >= 93.6 AND v <= 94.77 THEN RETURN 95; END IF;
  IF v >= 92.42 AND v <= 93.59 THEN RETURN 94; END IF;
  IF v >= 91.24 AND v <= 92.41 THEN RETURN 93; END IF;
  IF v >= 90.06 AND v <= 91.23 THEN RETURN 92; END IF;
  IF v >= 88.88 AND v <= 90.05 THEN RETURN 91; END IF;
  IF v >= 87.7 AND v <= 88.87 THEN RETURN 90; END IF;
  IF v >= 86.52 AND v <= 87.69 THEN RETURN 89; END IF;
  IF v >= 85.34 AND v <= 86.51 THEN RETURN 88; END IF;
  IF v >= 84.16 AND v <= 85.33 THEN RETURN 87; END IF;
  IF v >= 82.98 AND v <= 84.15 THEN RETURN 86; END IF;
  IF v >= 81.8 AND v <= 82.97 THEN RETURN 85; END IF;
  IF v >= 80.62 AND v <= 81.79 THEN RETURN 84; END IF;
  IF v >= 79.44 AND v <= 80.61 THEN RETURN 83; END IF;
  IF v >= 78.26 AND v <= 79.43 THEN RETURN 82; END IF;
  IF v >= 77.08 AND v <= 78.25 THEN RETURN 81; END IF;
  IF v >= 75.9 AND v <= 77.07 THEN RETURN 80; END IF;
  IF v >= 74.72 AND v <= 75.89 THEN RETURN 79; END IF;
  IF v >= 73.54 AND v <= 74.71 THEN RETURN 78; END IF;
  IF v >= 72.36 AND v <= 73.53 THEN RETURN 77; END IF;
  IF v >= 71.18 AND v <= 72.35 THEN RETURN 76; END IF;
  IF v >= 70 AND v <= 71.17 THEN RETURN 75; END IF;
  IF v >= 46.67 AND v <= 51.33 THEN RETURN 70; END IF;
  IF v >= 42.01 AND v <= 46.66 THEN RETURN 69; END IF;
  IF v >= 37.34 AND v <= 42 THEN RETURN 68; END IF;
  IF v >= 32.68 AND v <= 37.33 THEN RETURN 67; END IF;
  IF v >= 28.01 AND v <= 32.67 THEN RETURN 66; END IF;
  IF v >= 23.35 AND v <= 28 THEN RETURN 65; END IF;
  IF v >= 18.68 AND v <= 23.34 THEN RETURN 64; END IF;
  IF v >= 14.01 AND v <= 18.67 THEN RETURN 63; END IF;
  IF v >= 9.35 AND v <= 14 THEN RETURN 62; END IF;
  IF v >= 4.68 AND v <= 9.34 THEN RETURN 61; END IF;
  IF v >= 0 AND v <= 4.67 THEN RETURN 60; END IF;

  -- Gap on official table: initial grades roughly 51.34–69.99 have no transmuted value
  RETURN NULL;
END;
$$;

-- Example lookups (safe to run):
-- SELECT transmute_grade_sy_2026_2027(95.5) AS transmuted;  -- expect 97
-- SELECT transmute_grade_sy_2026_2027(88.0) AS transmuted;  -- expect 90
-- SELECT transmute_grade_sy_2026_2027(60.0) AS transmuted;  -- expect NULL (gap)
