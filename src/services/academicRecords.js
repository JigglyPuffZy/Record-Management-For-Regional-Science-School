// Shared records cache and business logic for the authorized server APIs.

import { SCHOOL, ACTIVE_SCHOOL_YEAR } from '../data/schools.js';
import { SUBJECTS, getSubjectById } from '../data/subjects.js';
import {
  TEACHING_ASSIGNMENTS,
  getClassById,
  getClassLabel,
  getClassesForTeacher as getAssignedClasses,
  getAssignmentsForTeacher,
  getSubjectIdsForTeacherInClass,
  teacherOwnsClassSubject,
  getTeacherForClassSubject,
  setClassesCache,
} from '../data/classes.js';
import {
  getStudentById,
  getStudentsByClass,
  setStudentsCache,
} from '../data/students.js';
import {
  hydrateAllFromDb,
  saveGradeInDb,
} from './supabaseData.js';
import { getTeacherById, setTeachersCache } from '../data/teachers.js';
import { getAcademicHistoryForStudent, setAcademicHistoryCache, buildAcademicHistory } from '../data/academicHistory.js';
import { isValidGrade, computeAverage } from '../lib/utils.js';
import {
  getGradingPeriodsForGradeLevel,
  gradeRecordHasGap,
  getCurriculumForGradeLevel,
} from '../data/curriculum.js';
import { getDescriptorForGradeLevel } from '../lib/grading.js';

let grades = [];
let activeSchoolYear = ACTIVE_SCHOOL_YEAR;
let eligibilityRecords = [];
let historyData;
let revision = 0;
const listeners = new Set();
let hydration;
let generation = 0;
function notifyGradeListeners() {
  if (historyData) setAcademicHistoryCache(buildAcademicHistory({ ...historyData, grades, school: SCHOOL, subjects: SUBJECTS }));
  listeners.forEach(fn => fn());
}

export function hydrateRecords({ force = false } = {}) {
  if (force) { generation += 1; hydration = undefined; }
  if (hydration) return hydration;
  const started = generation;
  const startedRevision = revision;
  const pending = hydrateAllFromDb().then(({ students, grades: dbGrades, classes, assignments, teachers, ...extra }) => {
    if (started !== generation || startedRevision !== revision) return;
    activeSchoolYear = extra.schoolYears.find(year => year.is_active)?.id || ACTIVE_SCHOOL_YEAR;
    eligibilityRecords = extra.eligibility;
    historyData = { classes, teachers, archives: extra.archives, archivedGrades: extra.archivedGrades, remedials: extra.remedials };
    setClassesCache(classes, assignments);
    setTeachersCache(teachers);
    setStudentsCache(students);
    grades = dbGrades;
    notifyGradeListeners();
  }).finally(() => { if (hydration === pending) hydration = undefined; });
  hydration = pending;
  return hydration;
}

export function clearRecords() {
  generation += 1;
  hydration = undefined;
  grades = [];
  activeSchoolYear = ACTIVE_SCHOOL_YEAR;
  eligibilityRecords = [];
  historyData = undefined;
  setAcademicHistoryCache([]);
  setStudentsCache([]);
  setClassesCache([], []);
  setTeachersCache([]);
}

export function subscribeToGrades(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSchool() {
  return SCHOOL;
}

export function getActiveSchoolYear() {
  return activeSchoolYear;
}

export function getGradingPeriodsForClass(classId) {
  const cls = getClassById(classId);
  return getGradingPeriodsForGradeLevel(cls?.gradeLevel ?? 'Grade 7');
}
export function getSubjects() {
  return SUBJECTS;
}

export {
  getClassById,
  getClassLabel,
  getSubjectById,
  getSubjectIdsForTeacherInClass,
};

export function getClassesForTeacher(teacherId) {
  return getAssignedClasses(teacherId).filter(cls => cls.schoolYear === activeSchoolYear);
}

export function getStudent(studentId) {
  return getStudentById(studentId);
}
export function getTeacher(teacherId) {
  return getTeacherById(teacherId);
}
export function getRoster(classId) {
  return getStudentsByClass(classId).slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function getTeachingAssignments(teacherId) {
  return getAssignmentsForTeacher(teacherId).filter(a => getClassById(a.classId)?.schoolYear === activeSchoolYear).map((a) => ({
    ...a,
    classLabel: getClassLabel(a.classId),
    subjectName: getSubjectById(a.subjectId)?.name ?? a.subjectId,
  }));
}

function findGradeRecord(studentId, classId, subjectId, schoolYear) {
  return grades.find(
    (g) => g.studentId === studentId && g.classId === classId && g.subjectId === subjectId && g.schoolYear === schoolYear,
  );
}

function blankRow(studentId, classId, subjectId, schoolYear) {
  const gradeLevel = getClassById(classId)?.gradeLevel ?? null;
  return {
    studentId,
    classId,
    subjectId,
    schoolYear,
    gradeLevel,
    quarter1: null,
    quarter2: null,
    quarter3: null,
    quarter4: null,
    finalGrade: null,
  };
}

function enrichGradeRow(row) {
  const gradeLevel = row.gradeLevel ?? getClassById(row.classId)?.gradeLevel ?? 'Grade 7';
  const eval_ = getDescriptorForGradeLevel(gradeLevel, row.finalGrade);
  return {
    ...row,
    gradeLevel,
    descriptor: eval_.descriptor,
    filipinoDescriptor: eval_.filipinoDescriptor,
    remarks: eval_.remarks,
    gradingPeriods: getGradingPeriodsForGradeLevel(gradeLevel),
  };
}

function getGradeRow(studentId, classId, subjectId, schoolYear = activeSchoolYear) {
  const row = findGradeRecord(studentId, classId, subjectId, schoolYear) ?? blankRow(studentId, classId, subjectId, schoolYear);
  return enrichGradeRow(row);
}

export function getClassRecordRows(classId, subjectId, schoolYear = activeSchoolYear) {
  return getRoster(classId).map((student) => {
    const row = getGradeRow(student.studentId, classId, subjectId, schoolYear);
    return { student, ...row };
  });
}

function getSubjectIdsForClass(classId) {
  const ids = new Set();
  for (const g of grades) if (g.classId === classId) ids.add(g.subjectId);
  for (const a of TEACHING_ASSIGNMENTS) if (a.classId === classId) ids.add(a.subjectId);
  return SUBJECTS.filter((s) => ids.has(s.id)).map((s) => s.id);
}

export function getCurrentYearGrades(studentId, schoolYear) {
  const student = getStudentById(studentId);
  if (!student) return [];
  schoolYear ??= getClassById(student.classId)?.schoolYear || activeSchoolYear;
  const assignedSubjects = getSubjectIdsForClass(student.classId);

  return assignedSubjects.map((subjectId) => {
    const row = getGradeRow(studentId, student.classId, subjectId, schoolYear);
    const teacherId = getTeacherForClassSubject(student.classId, subjectId);
    const teacher = teacherId ? getTeacherById(teacherId) : null;
    return {
      subjectId,
      subjectName: getSubjectById(subjectId)?.name ?? subjectId,
      teacherName: teacher?.name ?? 'Unassigned',
      classId: student.classId,
      gradeLevel: row.gradeLevel,
      quarter1: row.quarter1,
      quarter2: row.quarter2,
      quarter3: row.quarter3,
      quarter4: row.quarter4,
      finalGrade: row.finalGrade,
      descriptor: row.descriptor,
      filipinoDescriptor: row.filipinoDescriptor,
      remarks: row.remarks,
      gradingPeriods: row.gradingPeriods,
    };
  });
}

export function getGeneralAverage(studentId, schoolYear) {
  const rows = getCurrentYearGrades(studentId, schoolYear);
  return rows.length && rows.every(row => row.finalGrade != null) ? computeAverage(rows.map((r) => r.finalGrade)) : null;
}

function getSubjectCount(studentId, schoolYear) {
  return getCurrentYearGrades(studentId, schoolYear).length;
}

export function getSF10(studentId) {
  const student = getStudentById(studentId);
  if (!student) return null;
  const cls = getClassById(student.classId);
  const gradeLevel = cls?.gradeLevel ?? 'Unknown';
  const learnerYear = cls?.schoolYear || activeSchoolYear;
  const currentSubjects = getCurrentYearGrades(studentId, learnerYear);
  const history = getAcademicHistoryForStudent(studentId).filter(year => year.schoolYear !== learnerYear);
  const eligibility = eligibilityRecords.find(row => row.student_id === studentId);
  const curriculum = getCurriculumForGradeLevel(gradeLevel);

  return {
    learner: {
      name: student.name,
      lastName: student.lastName,
      firstName: student.firstName,
      middleName: student.middleName,
      nameExtension: student.nameExtension,
      lrn: student.lrn,
      birthdate: student.birthdate,
      sex: student.sex,
      gradeLevel,
      section: cls?.section ?? 'Unknown',
      schoolYear: learnerYear,
      school: SCHOOL.name,
      status: student.status,
    },
    eligibility: eligibility?.details || {},
    versions: { learnerUpdatedAt: student.updatedAt, eligibilityUpdatedAt: eligibility?.updated_at ?? null },
    currentYear: {
      schoolYear: learnerYear,
      gradeLevel,
      section: cls?.section ?? 'Unknown',
      school: SCHOOL.name,
      schoolId: SCHOOL.schoolId,
      district: SCHOOL.district,
      division: SCHOOL.division,
      region: SCHOOL.region,
      adviser: cls ? getTeacherById(cls.adviserId)?.name ?? 'Unassigned' : 'Unassigned',
      subjects: currentSubjects,
      generalAverage: currentSubjects.length && currentSubjects.every(s => s.finalGrade != null) ? computeAverage(currentSubjects.map(s => s.finalGrade)) : null,
      gradingPeriods: curriculum.periods,
      finalLabel: curriculum.finalLabel,
      scale: curriculum.scale,
      isCurrent: learnerYear === activeSchoolYear && student.status === 'Active',
    },
    history,
  };
}

export class GradeValidationError extends Error {}

/**
 * Saves a single period grade. `period` is the period id (e.g. term1, quarter1)
 * or the storage field name (quarter1).
 */
function applyGradeToCache(row) {
  const idx = grades.findIndex(
    (g) => g.studentId === row.studentId && g.classId === row.classId && g.subjectId === row.subjectId && g.schoolYear === row.schoolYear,
  );
  if (idx >= 0) grades[idx] = row;
  else grades.push(row);
}

export async function saveGrade({ teacherId, studentId, classId, subjectId, schoolYear = activeSchoolYear, quarter, value }) {
  if (teacherId && !teacherOwnsClassSubject(teacherId, classId, subjectId)) {
    throw new GradeValidationError('You are not assigned to this class and subject.');
  }
  const gradeLevel = getClassById(classId)?.gradeLevel ?? 'Grade 7';
  const periods = getGradingPeriodsForGradeLevel(gradeLevel);
  const periodDef = periods.find((p) => p.id === quarter || p.field === quarter);
  if (!periodDef) {
    throw new GradeValidationError('Invalid grading period for this grade level.');
  }

  const cleared = value === '' || value === null || value === undefined;
  if (!cleared && !isValidGrade(value)) {
    throw new GradeValidationError('Invalid grade. Please enter a value from 0 to 100.');
  }

  revision += 1;
  const saved = await saveGradeInDb({
    studentId, classId, subjectId, schoolYear,
    field: periodDef.field,
    value: cleared ? null : Number(value),
  });
  revision += 1;
  applyGradeToCache(saved);
  notifyGradeListeners();
  return enrichGradeRow(saved);
}

export async function saveGradesBulk(entries) {
  for (const e of entries) {
    if (e.teacherId && !teacherOwnsClassSubject(e.teacherId, e.classId, e.subjectId)) {
      throw new GradeValidationError('You are not assigned to this class and subject.');
    }
    const gradeLevel = getClassById(e.classId)?.gradeLevel ?? 'Grade 7';
    const periods = getGradingPeriodsForGradeLevel(gradeLevel);
    const periodDef = periods.find((p) => p.id === e.quarter || p.field === e.quarter);
    const cleared = e.value === '' || e.value === null || e.value === undefined;
    if (!cleared && !isValidGrade(e.value)) {
      const name = getStudentById(e.studentId)?.name ?? e.studentId;
      throw new GradeValidationError(`Invalid grade for ${name}. Please enter a value from 0 to 100.`);
    }
    if (!periodDef) {
      throw new GradeValidationError('Invalid grading period for this grade level.');
    }
  }
  const results = [];
  for (const e of entries) {
    results.push(await saveGrade(e));
  }
  return results;
}

export function getStudentDashboardSummary(studentId) {
  const student = getStudentById(studentId);
  if (!student) return null;
  const cls = getClassById(student.classId);
  return {
    student,
    classLabel: cls ? getClassLabel(cls.id) : 'Unassigned',
    schoolYear: cls?.schoolYear || activeSchoolYear,
    generalAverage: getGeneralAverage(student.studentId),
    subjectCount: getSubjectCount(student.studentId),
    status: student.status,
    gradeLevel: cls?.gradeLevel ?? 'Unknown',
  };
}

export function getTeacherDashboardSummary(teacherId) {
  const teacher = getTeacherById(teacherId);
  if (!teacher) return null;
  const classes = getClassesForTeacher(teacherId);
  const assignments = getTeachingAssignments(teacherId);
  const subjectNames = [...new Set(assignments.map((a) => a.subjectName))];
  const studentIds = new Set();
  for (const cls of classes) {
    const subjectIdsForClass = getSubjectIdsForTeacherInClass(teacherId, cls.id);
    if (subjectIdsForClass.length === 0) continue;
    for (const s of getStudentsByClass(cls.id)) studentIds.add(s.studentId);
  }

  let pending = 0;
  for (const a of assignments) {
    const gradeLevel = getClassById(a.classId)?.gradeLevel ?? 'Grade 7';
    const rows = getClassRecordRows(a.classId, a.subjectId, activeSchoolYear);
    const hasGap = rows.some((row) => gradeRecordHasGap(gradeLevel, row));
    if (hasGap) pending += 1;
  }

  return {
    teacher,
    schoolYear: activeSchoolYear,
    classes,
    totalStudents: studentIds.size,
    subjectNames,
    pendingRecords: pending,
  };
}

export function getStudentsForTeacher(teacherId) {
  const classes = getClassesForTeacher(teacherId);
  const seen = new Map();
  for (const cls of classes) {
    for (const s of getStudentsByClass(cls.id)) seen.set(s.studentId, s);
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function teacherCanViewStudent(teacherId, studentId) {
  return getStudentsForTeacher(teacherId).some((s) => s.studentId === studentId);
}
