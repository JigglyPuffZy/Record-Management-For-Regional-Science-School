import { getSubjectById } from '../data/subjects.js';
import { getCurriculumForGradeLevel } from '../data/curriculum.js';

export const isJHSQuarterlyGrade = gradeLevel => ['Grade 7', 'Grade 8', 'Grade 9'].includes(gradeLevel);
const JHS_LEARNING_AREAS = ['FIL', 'ENG', 'MATH', 'SCI', 'AP', 'VALUES_ED', 'TLE', 'MAPEH'];

export function getSF10LearningAreas(gradeLevel, subjects) {
  if (!isJHSQuarterlyGrade(gradeLevel)) return subjects;
  const rows = JHS_LEARNING_AREAS.map(subjectId => {
    const existing = subjects.find(subject => subject.subjectId === subjectId);
    return existing ? { ...existing, subjectName: getSubjectById(subjectId).name } : {
      subjectId, subjectName: getSubjectById(subjectId).name,
      quarter1: null, quarter2: null, quarter3: null, quarter4: null, finalGrade: null,
    };
  });
  // Keep Research and legacy subjects with their existing IDs and grades.
  return rows.concat(subjects.filter(subject => !JHS_LEARNING_AREAS.includes(subject.subjectId)));
}

export function getSF10HistorySections(history, currentGradeLevel) {
  const sections = [...history];
  const currentGrade = Number(currentGradeLevel?.replace('Grade ', ''));
  for (const grade of [7, 8, 9]) {
    const gradeLevel = `Grade ${grade}`;
    if (grade >= currentGrade || !currentGrade || sections.some(year => year.gradeLevel === gradeLevel)) continue;
    const curriculum = getCurriculumForGradeLevel(gradeLevel);
    sections.push({ gradeLevel, schoolYear: '', subjects: [], generalAverage: null, gradingPeriods: curriculum.periods,
      finalLabel: curriculum.finalLabel, scale: curriculum.scale, isPlaceholder: true });
  }
  return sections.sort((a, b) => Number(a.gradeLevel.replace('Grade ', '')) - Number(b.gradeLevel.replace('Grade ', '')) || a.schoolYear.localeCompare(b.schoolYear));
}
