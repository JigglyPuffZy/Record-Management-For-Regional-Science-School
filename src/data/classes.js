// Populated from the authorized records API after sign-in.
import { formatClassLabel } from '../lib/utils.js';
let CLASSES = [];

export let TEACHING_ASSIGNMENTS = [];
export function setClassesCache(classes, assignments) {
  CLASSES = classes;
  TEACHING_ASSIGNMENTS = assignments;
}

export function getClassById(classId) {
  return CLASSES.find((c) => c.id === classId) ?? null;
}

export function getClassLabel(classId) {
  const c = getClassById(classId);
  return c ? formatClassLabel(c.gradeLevel, c.section) : classId;
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
