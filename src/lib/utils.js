// Small framework-free helpers shared across UI components and pages.

/** Join class name fragments, skipping falsy values. */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

/** DepEd passing mark. */
export const PASSING_GRADE = 75;

/** True if `value` is a valid DepEd numeric grade (0-100, allows one decimal). */
export function isValidGrade(value) {
  if (value === '' || value === null || value === undefined) return false;
  const num = Number(value);
  if (Number.isNaN(num)) return false;
  if (num < 0 || num > 100) return false;
  return true;
}

/** Format a grade for display; empty/null becomes an em dash. */
export function formatGrade(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// Centralized DepEd grading scale — the single place descriptor/remarks are
// derived from a numeric grade. Add every consumer through the helpers below
// instead of re-deriving "Passed"/"Outstanding" text inline in a component.
const GRADE_SCALE = [
  { min: 90, max: 100, descriptor: 'Outstanding', remarks: 'Passed' },
  { min: 85, max: 89, descriptor: 'Very Satisfactory', remarks: 'Passed' },
  { min: 80, max: 84, descriptor: 'Satisfactory', remarks: 'Passed' },
  { min: 75, max: 79, descriptor: 'Fairly Satisfactory', remarks: 'Passed' },
  { min: -Infinity, max: 74, descriptor: 'Did Not Meet Expectations', remarks: 'Failed' },
];

function findGradeBand(grade) {
  const num = Number(grade);
  return GRADE_SCALE.find((band) => num >= band.min && num <= band.max) ?? null;
}

/** DepEd descriptor for a numeric grade (e.g. 92 -> "Outstanding"); '' if ungraded. */
export function getGradeDescriptor(grade) {
  if (grade === null || grade === undefined || grade === '') return '';
  return findGradeBand(grade)?.descriptor ?? '';
}

/** Passed/Failed remarks for a numeric grade; '' if ungraded. */
export function getRemarks(finalGrade) {
  if (finalGrade === null || finalGrade === undefined || finalGrade === '') return '';
  return findGradeBand(finalGrade)?.remarks ?? (Number(finalGrade) >= PASSING_GRADE ? 'Passed' : 'Failed');
}

/** Convenience: both descriptor and remarks in one call. */
export function getGradeEvaluation(grade) {
  return { descriptor: getGradeDescriptor(grade), remarks: getRemarks(grade) };
}

/** Rounds to the nearest whole number, DepEd style (no decimals on report cards). */
export function roundGrade(value) {
  return Math.round(value);
}

/** Average of the provided numeric values, ignoring null/undefined; null if none present. */
export function computeAverage(values) {
  const nums = values.filter((v) => v !== null && v !== undefined && v !== '').map(Number);
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return roundGrade(sum / nums.length);
}

/** Computes the Final Grade from four terms; null unless all four terms are present. */
export function computeFinalGrade(q1, q2, q3, q4) {
  const quarters = [q1, q2, q3, q4];
  if (quarters.some((q) => q === null || q === undefined || q === '')) return null;
  return computeAverage(quarters);
}

export function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
