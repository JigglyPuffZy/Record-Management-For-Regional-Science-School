import { ACTIVE_SCHOOL_YEAR } from './schools.js';

export const CLASSES = [
  { id: 'G7-RIZAL', gradeLevel: 'Grade 7', section: 'Rizal', schoolYear: ACTIVE_SCHOOL_YEAR, adviserId: 'T-2003' },
  { id: 'G8-BONIFACIO', gradeLevel: 'Grade 8', section: 'Bonifacio', schoolYear: ACTIVE_SCHOOL_YEAR, adviserId: 'T-2002' },
  { id: 'G9-MABINI', gradeLevel: 'Grade 9', section: 'Mabini', schoolYear: ACTIVE_SCHOOL_YEAR, adviserId: 'T-2001' },
  { id: 'G10-RIZAL', gradeLevel: 'Grade 10', section: 'Rizal', schoolYear: ACTIVE_SCHOOL_YEAR, adviserId: 'T-2001' },
];

export const TEACHING_ASSIGNMENTS = [
  // Ramon Santos — Mathematics & Science
  { teacherId: 'T-2001', classId: 'G7-RIZAL', subjectId: 'MATH' },
  { teacherId: 'T-2001', classId: 'G8-BONIFACIO', subjectId: 'MATH' },
  { teacherId: 'T-2001', classId: 'G9-MABINI', subjectId: 'MATH' },
  { teacherId: 'T-2001', classId: 'G10-RIZAL', subjectId: 'MATH' },
  { teacherId: 'T-2001', classId: 'G7-RIZAL', subjectId: 'SCI' },
  { teacherId: 'T-2001', classId: 'G8-BONIFACIO', subjectId: 'SCI' },
  { teacherId: 'T-2001', classId: 'G9-MABINI', subjectId: 'SCI' },
  { teacherId: 'T-2001', classId: 'G10-RIZAL', subjectId: 'SCI' },
  // Liza Fernandez — Filipino & English
  { teacherId: 'T-2002', classId: 'G7-RIZAL', subjectId: 'FIL' },
  { teacherId: 'T-2002', classId: 'G8-BONIFACIO', subjectId: 'FIL' },
  { teacherId: 'T-2002', classId: 'G9-MABINI', subjectId: 'FIL' },
  { teacherId: 'T-2002', classId: 'G10-RIZAL', subjectId: 'FIL' },
  { teacherId: 'T-2002', classId: 'G7-RIZAL', subjectId: 'ENG' },
  { teacherId: 'T-2002', classId: 'G8-BONIFACIO', subjectId: 'ENG' },
  { teacherId: 'T-2002', classId: 'G9-MABINI', subjectId: 'ENG' },
  { teacherId: 'T-2002', classId: 'G10-RIZAL', subjectId: 'ENG' },
  // Edgar Cruz — Araling Panlipunan, ESP & MAPEH
  { teacherId: 'T-2003', classId: 'G7-RIZAL', subjectId: 'AP' },
  { teacherId: 'T-2003', classId: 'G8-BONIFACIO', subjectId: 'AP' },
  { teacherId: 'T-2003', classId: 'G9-MABINI', subjectId: 'AP' },
  { teacherId: 'T-2003', classId: 'G10-RIZAL', subjectId: 'AP' },
  { teacherId: 'T-2003', classId: 'G7-RIZAL', subjectId: 'ESP' },
  { teacherId: 'T-2003', classId: 'G8-BONIFACIO', subjectId: 'ESP' },
  { teacherId: 'T-2003', classId: 'G9-MABINI', subjectId: 'ESP' },
  { teacherId: 'T-2003', classId: 'G10-RIZAL', subjectId: 'ESP' },
  { teacherId: 'T-2003', classId: 'G7-RIZAL', subjectId: 'MAPEH' },
  { teacherId: 'T-2003', classId: 'G8-BONIFACIO', subjectId: 'MAPEH' },
  { teacherId: 'T-2003', classId: 'G9-MABINI', subjectId: 'MAPEH' },
  { teacherId: 'T-2003', classId: 'G10-RIZAL', subjectId: 'MAPEH' },
  // Corazon Villanueva — TLE, Music & Arts, PE & Health
  { teacherId: 'T-2004', classId: 'G7-RIZAL', subjectId: 'TLE' },
  { teacherId: 'T-2004', classId: 'G8-BONIFACIO', subjectId: 'TLE' },
  { teacherId: 'T-2004', classId: 'G9-MABINI', subjectId: 'TLE' },
  { teacherId: 'T-2004', classId: 'G10-RIZAL', subjectId: 'TLE' },
  { teacherId: 'T-2004', classId: 'G7-RIZAL', subjectId: 'MUSIC_ARTS' },
  { teacherId: 'T-2004', classId: 'G8-BONIFACIO', subjectId: 'MUSIC_ARTS' },
  { teacherId: 'T-2004', classId: 'G9-MABINI', subjectId: 'MUSIC_ARTS' },
  { teacherId: 'T-2004', classId: 'G10-RIZAL', subjectId: 'MUSIC_ARTS' },
  { teacherId: 'T-2004', classId: 'G7-RIZAL', subjectId: 'PE_HEALTH' },
  { teacherId: 'T-2004', classId: 'G8-BONIFACIO', subjectId: 'PE_HEALTH' },
  { teacherId: 'T-2004', classId: 'G9-MABINI', subjectId: 'PE_HEALTH' },
  { teacherId: 'T-2004', classId: 'G10-RIZAL', subjectId: 'PE_HEALTH' },
];

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
