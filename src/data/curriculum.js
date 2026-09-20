// Curriculum-aware grading period configuration per grade level.
// Period `field` names map to the grade-record storage keys in
// services/academicRecords.js (quarter1–quarter4 storage fields map to
// Term 1 → quarter1, Term 2 → quarter2, etc.).

import { computeAverage } from '../lib/utils.js';

export const CURRICULUM_BY_GRADE = {
  'Grade 7': {
    scale: 'jhs',
    periods: [
      { id: 'term1', label: 'Term 1', field: 'quarter1' },
      { id: 'term2', label: 'Term 2', field: 'quarter2' },
      { id: 'term3', label: 'Term 3', field: 'quarter3' },
      { id: 'term4', label: 'Term 4', field: 'quarter4' },
    ],
    finalLabel: 'Final Rating',
  },
  'Grade 8': {
    scale: 'jhs',
    periods: [
      { id: 'term1', label: 'Term 1', field: 'quarter1' },
      { id: 'term2', label: 'Term 2', field: 'quarter2' },
      { id: 'term3', label: 'Term 3', field: 'quarter3' },
      { id: 'term4', label: 'Term 4', field: 'quarter4' },
    ],
    finalLabel: 'Final Rating',
  },
  'Grade 9': {
    scale: 'jhs',
    periods: [
      { id: 'term1', label: 'Term 1', field: 'quarter1' },
      { id: 'term2', label: 'Term 2', field: 'quarter2' },
      { id: 'term3', label: 'Term 3', field: 'quarter3' },
      { id: 'term4', label: 'Term 4', field: 'quarter4' },
    ],
    finalLabel: 'Final Rating',
  },
  'Grade 10': {
    scale: 'grade10',
    periods: [
      { id: 'term1', label: 'Term 1', field: 'quarter1' },
      { id: 'term2', label: 'Term 2', field: 'quarter2' },
      { id: 'term3', label: 'Term 3', field: 'quarter3' },
    ],
    finalLabel: 'Final Rating',
  },
};

const DEFAULT_CURRICULUM = CURRICULUM_BY_GRADE['Grade 7'];

export function getCurriculumForGradeLevel(gradeLevel) {
  return CURRICULUM_BY_GRADE[gradeLevel] ?? DEFAULT_CURRICULUM;
}

export function getGradingPeriodsForGradeLevel(gradeLevel) {
  return getCurriculumForGradeLevel(gradeLevel).periods;
}

export function getPeriodFieldsForGradeLevel(gradeLevel) {
  return getGradingPeriodsForGradeLevel(gradeLevel).map((p) => p.field);
}

export function getPeriodIdForField(gradeLevel, field) {
  const period = getGradingPeriodsForGradeLevel(gradeLevel).find((p) => p.field === field);
  return period?.id ?? field;
}

export function getPeriodLabel(gradeLevel, periodIdOrField) {
  const periods = getGradingPeriodsForGradeLevel(gradeLevel);
  const period = periods.find((p) => p.id === periodIdOrField || p.field === periodIdOrField);
  return period?.label ?? periodIdOrField;
}

/** Computes final rating from a grade record using the curriculum for that grade level. */
export function computeFinalGradeForLevel(gradeLevel, record) {
  const fields = getPeriodFieldsForGradeLevel(gradeLevel);
  const values = fields.map((f) => record[f]);
  if (values.some((v) => v === null || v === undefined || v === '')) return null;
  return computeAverage(values);
}

/** True when every configured period for the grade level has a value. */
export function isGradeRecordComplete(gradeLevel, record) {
  return getPeriodFieldsForGradeLevel(gradeLevel).every(
    (f) => record[f] !== null && record[f] !== undefined && record[f] !== '',
  );
}

/** True when at least one configured period is still empty. */
export function gradeRecordHasGap(gradeLevel, record) {
  return getPeriodFieldsForGradeLevel(gradeLevel).some(
    (f) => record[f] === null || record[f] === undefined || record[f] === '',
  );
}
