/**
 * New Transmutation Table — SY 2026–2027
 * Maps initial grade (percentage) to transmuted grade (60–100).
 */

export const TRANSMUTATION_SCHOOL_YEAR = '2026–2027';

/** @type {{ min: number, max: number, transmuted: number }[]} */
export const TRANSMUTATION_TABLE_SY_2026_2027 = [
  { min: 99.5, max: 100, transmuted: 100 },
  { min: 98.32, max: 99.49, transmuted: 99 },
  { min: 97.14, max: 98.31, transmuted: 98 },
  { min: 95.96, max: 97.13, transmuted: 97 },
  { min: 94.78, max: 95.95, transmuted: 96 },
  { min: 93.6, max: 94.77, transmuted: 95 },
  { min: 92.42, max: 93.59, transmuted: 94 },
  { min: 91.24, max: 92.41, transmuted: 93 },
  { min: 90.06, max: 91.23, transmuted: 92 },
  { min: 88.88, max: 90.05, transmuted: 91 },
  { min: 87.7, max: 88.87, transmuted: 90 },
  { min: 86.52, max: 87.69, transmuted: 89 },
  { min: 85.34, max: 86.51, transmuted: 88 },
  { min: 84.16, max: 85.33, transmuted: 87 },
  { min: 82.98, max: 84.15, transmuted: 86 },
  { min: 81.8, max: 82.97, transmuted: 85 },
  { min: 80.62, max: 81.79, transmuted: 84 },
  { min: 79.44, max: 80.61, transmuted: 83 },
  { min: 78.26, max: 79.43, transmuted: 82 },
  { min: 77.08, max: 78.25, transmuted: 81 },
  { min: 75.9, max: 77.07, transmuted: 80 },
  { min: 74.72, max: 75.89, transmuted: 79 },
  { min: 73.54, max: 74.71, transmuted: 78 },
  { min: 72.36, max: 73.53, transmuted: 77 },
  { min: 71.18, max: 72.35, transmuted: 76 },
  { min: 70, max: 71.17, transmuted: 75 },
  { min: 46.67, max: 51.33, transmuted: 70 },
  { min: 42.01, max: 46.66, transmuted: 69 },
  { min: 37.34, max: 42, transmuted: 68 },
  { min: 32.68, max: 37.33, transmuted: 67 },
  { min: 28.01, max: 32.67, transmuted: 66 },
  { min: 23.35, max: 28, transmuted: 65 },
  { min: 18.68, max: 23.34, transmuted: 64 },
  { min: 14.01, max: 18.67, transmuted: 63 },
  { min: 9.35, max: 14, transmuted: 62 },
  { min: 4.68, max: 9.34, transmuted: 61 },
  { min: 0, max: 4.67, transmuted: 60 },
];

/**
 * @param {number} initialGrade Raw weighted initial grade (0–100)
 * @returns {number | null} Transmuted grade, or null if outside published bands
 */
export function transmuteInitialGrade(initialGrade) {
  const value = Number(initialGrade);
  if (Number.isNaN(value)) {
    return null;
  }

  const rounded = Math.round(value * 100) / 100;
  const band = TRANSMUTATION_TABLE_SY_2026_2027.find(
    (row) => rounded >= row.min && rounded <= row.max,
  );

  return band?.transmuted ?? null;
}

export function isInitialGradeInTransmutationTable(initialGrade) {
  return transmuteInitialGrade(initialGrade) !== null;
}
