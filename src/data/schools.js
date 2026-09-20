// Static school identity + school-year catalog.
// A real backend would expose this via a /schools endpoint; kept as a
// plain object here so it is trivial to swap out later.

export const SCHOOL = {
  name: 'Bagong Pag-asa National High School',
  schoolId: '301234',
  district: 'Quezon City District IV',
  address: 'Brgy. San Isidro, Quezon City, Metro Manila',
  division: 'Schools Division Office – Quezon City',
  region: 'National Capital Region (NCR)',
};

export const SCHOOL_YEARS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024'];
export const ACTIVE_SCHOOL_YEAR = '2026-2027';

// All grade levels actively supported. Grade 10 is the current cohort for SY 2026-2027.
export const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];

/** @deprecated Use getGradingPeriodsForGradeLevel from curriculum.js instead. */
export const GRADING_PERIODS = [
  { id: 'term1', label: 'Term 1' },
  { id: 'term2', label: 'Term 2' },
  { id: 'term3', label: 'Term 3' },
  { id: 'term4', label: 'Term 4' },
];
