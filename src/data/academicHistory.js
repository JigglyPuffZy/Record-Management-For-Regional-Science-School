// Archived SF10 history — empty until students complete school years.

export const ACADEMIC_HISTORY = {};

export function getAcademicHistoryForStudent(studentId) {
  return ACADEMIC_HISTORY[studentId] ?? [];
}
