// Curriculum-aware grading period configuration per grade level.
// Period `field` names map to the grade-record storage keys in
// services/academicRecords.js (quarter1–quarter4 storage fields map to
// Quarter 1 / Term 1 → quarter1, etc.).

const CURRICULUM_BY_GRADE = {
  'Grade 7': {
    scale: 'jhs',
    periods: [
      { id: 'term1', label: 'Quarter 1', field: 'quarter1' },
      { id: 'term2', label: 'Quarter 2', field: 'quarter2' },
      { id: 'term3', label: 'Quarter 3', field: 'quarter3' },
      { id: 'term4', label: 'Quarter 4', field: 'quarter4' },
    ],
    finalLabel: 'Final Rating',
  },
  'Grade 8': {
    scale: 'jhs',
    periods: [
      { id: 'term1', label: 'Quarter 1', field: 'quarter1' },
      { id: 'term2', label: 'Quarter 2', field: 'quarter2' },
      { id: 'term3', label: 'Quarter 3', field: 'quarter3' },
      { id: 'term4', label: 'Quarter 4', field: 'quarter4' },
    ],
    finalLabel: 'Final Rating',
  },
  'Grade 9': {
    scale: 'jhs',
    periods: [
      { id: 'term1', label: 'Quarter 1', field: 'quarter1' },
      { id: 'term2', label: 'Quarter 2', field: 'quarter2' },
      { id: 'term3', label: 'Quarter 3', field: 'quarter3' },
      { id: 'term4', label: 'Quarter 4', field: 'quarter4' },
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

function getPeriodFieldsForGradeLevel(gradeLevel) {
  return getGradingPeriodsForGradeLevel(gradeLevel).map((p) => p.field);
}

/** True when at least one configured period is still empty. */
export function gradeRecordHasGap(gradeLevel, record) {
  return getPeriodFieldsForGradeLevel(gradeLevel).some(
    (f) => record[f] === null || record[f] === undefined || record[f] === '',
  );
}
