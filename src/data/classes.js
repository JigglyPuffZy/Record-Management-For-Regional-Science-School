import { ACTIVE_SCHOOL_YEAR } from './schools.js';
import { SUBJECTS } from './subjects.js';

// Matches Supabase after cleanup_single_teacher.sql — one class, one admin teacher.
export const CLASSES = [
  { id: 'G10-RIZAL', gradeLevel: 'Grade 10', section: 'Rizal', schoolYear: ACTIVE_SCHOOL_YEAR, adviserId: 'T-ADMIN' },
];

export const TEACHING_ASSIGNMENTS = SUBJECTS.map((s) => ({
  teacherId: 'T-ADMIN',
  classId: 'G10-RIZAL',
  subjectId: s.id,
}));

export function getClassById(classId) {
  return CLASSES.find((c) => c.id === classId) ?? null;
}

export function getClassLabel(classId) {
  const c = getClassById(classId);
  return c ? `${c.gradeLevel} - ${c.section}` : classId;
}

export function findClassByGradeAndSection(gradeLevel, section, schoolYear = ACTIVE_SCHOOL_YEAR) {
  return CLASSES.find(
    (c) => c.gradeLevel === gradeLevel && c.section === section && c.schoolYear === schoolYear,
  ) ?? null;
}

export function getSectionsForGradeLevel(gradeLevel, schoolYear = ACTIVE_SCHOOL_YEAR) {
  return CLASSES.filter((c) => c.gradeLevel === gradeLevel && c.schoolYear === schoolYear);
}

export function getAssignmentsForTeacher(teacherId) {
  return TEACHING_ASSIGNMENTS.filter((a) => a.teacherId === teacherId);
}

export function getClassesForTeacher(teacherId) {
  const classIds = new Set(getAssignmentsForTeacher(teacherId).map((a) => a.classId));
  return CLASSES.filter((c) => classIds.has(c.id));
}

export function getSubjectIdsForTeacherInClass(teacherId, classId) {
  return TEACHING_ASSIGNMENTS.filter((a) => a.teacherId === teacherId && a.classId === classId).map(
    (a) => a.subjectId,
  );
}

export function teacherOwnsClassSubject(teacherId, classId, subjectId) {
  return TEACHING_ASSIGNMENTS.some(
    (a) => a.teacherId === teacherId && a.classId === classId && a.subjectId === subjectId,
  );
}

export function getTeacherForClassSubject(classId, subjectId) {
  const a = TEACHING_ASSIGNMENTS.find((a) => a.classId === classId && a.subjectId === subjectId);
  return a ? a.teacherId : null;
}
