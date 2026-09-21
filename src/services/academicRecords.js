// Business-logic layer sitting between the UI and the "database".

import { SCHOOL, SCHOOL_YEARS, ACTIVE_SCHOOL_YEAR, GRADING_PERIODS } from '../data/schools.js';
import { SUBJECTS, getSubjectById } from '../data/subjects.js';
import {
  CLASSES,
  TEACHING_ASSIGNMENTS,
  getClassById,
  getClassLabel,
  getClassesForTeacher,
  getAssignmentsForTeacher,
  getSubjectIdsForTeacherInClass,
  teacherOwnsClassSubject,
  getTeacherForClassSubject,
  findClassByGradeAndSection,
  getSectionsForGradeLevel,
} from '../data/classes.js';
import {
  getStudentById,
  getStudentsByClass,
  createStudent,
  StudentValidationError,
  resetStudentsData,
  setStudentsCache,
  addStudentToCache,
} from '../data/students.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import {
  hydrateAllFromDb,
  createStudentInDb,
  saveGradeInDb,
} from './supabaseData.js';
import { getTeacherById } from '../data/teachers.js';
import { INITIAL_GRADES } from '../data/grades.js';
import { getAcademicHistoryForStudent } from '../data/academicHistory.js';
import { isValidGrade, computeAverage } from '../lib/utils.js';
import {
  getGradingPeriodsForGradeLevel,
  computeFinalGradeForLevel,
  gradeRecordHasGap,
  getCurriculumForGradeLevel,
} from '../data/curriculum.js';
import { getDescriptorForGradeLevel } from '../lib/grading.js';

const STORAGE_KEY = 'sf10_grades_v3';

function loadGrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through
  }
  return structuredClone(INITIAL_GRADES);
}

let grades = isSupabaseConfigured() ? [] : loadGrades();
const listeners = new Set();
let hydrating = false;
let hydrated = !isSupabaseConfigured();

function persist() {
  if (isSupabaseConfigured()) {
    listeners.forEach((fn) => fn());
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grades));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

export async function hydrateRecords() {
  if (!isSupabaseConfigured() || hydrating) return;
  hydrating = true;
  try {
    const { students, grades: dbGrades } = await hydrateAllFromDb();
    setStudentsCache(students);
    grades = dbGrades;
    hydrated = true;
    listeners.forEach((fn) => fn());
  } finally {
    hydrating = false;
  }
}

export function isRecordsHydrated() {
  return hydrated;
}

export function subscribeToGrades(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetMockData() {
  grades = structuredClone(INITIAL_GRADES);
  resetStudentsData();
  persist();
}

export function getSchool() {
  return SCHOOL;
}
export function getSchoolYears() {
  return SCHOOL_YEARS;
}
export function getActiveSchoolYear() {
  return ACTIVE_SCHOOL_YEAR;
}
/** @deprecated Prefer getGradingPeriodsForClass(classId) */
export function getGradingPeriods() {
  return GRADING_PERIODS;
}
export function getGradingPeriodsForClass(classId) {
  const cls = getClassById(classId);
  return getGradingPeriodsForGradeLevel(cls?.gradeLevel ?? 'Grade 7');
}
export function getSubjects() {
  return SUBJECTS;
}
export function getAllClasses() {
  return CLASSES;
}
export {
  getClassById,
  getClassLabel,
  getSubjectById,
  getClassesForTeacher,
  getSubjectIdsForTeacherInClass,
  teacherOwnsClassSubject,
  getSectionsForGradeLevel,
  findClassByGradeAndSection,
};
export { getDescriptorForGradeLevel, getGrade10Descriptor } from '../lib/grading.js';

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
  return getAssignmentsForTeacher(teacherId).map((a) => ({
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

export function getGradeRow(studentId, classId, subjectId, schoolYear = ACTIVE_SCHOOL_YEAR) {
  const row = findGradeRecord(studentId, classId, subjectId, schoolYear) ?? blankRow(studentId, classId, subjectId, schoolYear);
  return enrichGradeRow(row);
}

export function getClassRecordRows(classId, subjectId, schoolYear = ACTIVE_SCHOOL_YEAR) {
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

export function getCurrentYearGrades(studentId, schoolYear = ACTIVE_SCHOOL_YEAR) {
  const student = getStudentById(studentId);
  if (!student) return [];
  const assignedSubjects = getSubjectIdsForClass(student.classId);
  const gradeLevel = getClassById(student.classId)?.gradeLevel ?? 'Grade 7';

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

export function getGeneralAverage(studentId, schoolYear = ACTIVE_SCHOOL_YEAR) {
  const rows = getCurrentYearGrades(studentId, schoolYear);
  return computeAverage(rows.map((r) => r.finalGrade));
}

export function getSubjectCount(studentId, schoolYear = ACTIVE_SCHOOL_YEAR) {
  return getCurrentYearGrades(studentId, schoolYear).length;
}

export function getSF10(studentId) {
  const student = getStudentById(studentId);
  if (!student) return null;
  const cls = getClassById(student.classId);
  const gradeLevel = cls?.gradeLevel ?? 'Unknown';
  const currentSubjects = getCurrentYearGrades(studentId, ACTIVE_SCHOOL_YEAR);
  const history = getAcademicHistoryForStudent(studentId);
  const earliestYear = history.length > 0 ? history[0].schoolYear : ACTIVE_SCHOOL_YEAR;
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
      schoolYear: ACTIVE_SCHOOL_YEAR,
      school: SCHOOL.name,
      status: student.status,
    },
    eligibility: {
      basis: 'Completed Elementary Education (Grade 6)',
      eligible: student.status === 'Active',
      schoolYearEnrolled: earliestYear,
    },
    currentYear: {
      schoolYear: ACTIVE_SCHOOL_YEAR,
      gradeLevel,
      section: cls?.section ?? 'Unknown',
      school: SCHOOL.name,
      schoolId: SCHOOL.schoolId,
      district: SCHOOL.district,
      division: SCHOOL.division,
      region: SCHOOL.region,
      adviser: cls ? getTeacherById(cls.adviserId)?.name ?? 'Unassigned' : 'Unassigned',
      subjects: currentSubjects,
      generalAverage: getGeneralAverage(studentId),
      gradingPeriods: curriculum.periods,
      finalLabel: curriculum.finalLabel,
      scale: curriculum.scale,
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

export async function saveGrade({ teacherId, studentId, classId, subjectId, schoolYear = ACTIVE_SCHOOL_YEAR, quarter, value }) {
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

  if (isSupabaseConfigured()) {
    const saved = await saveGradeInDb({
      studentId,
      classId,
      subjectId,
      schoolYear,
      field: periodDef.field,
      value: cleared ? null : Number(value),
      updatedBy: teacherId ?? null,
    });
    applyGradeToCache(saved);
    persist();
    return enrichGradeRow(saved);
  }

  let record = findGradeRecord(studentId, classId, subjectId, schoolYear);
  if (!record) {
    record = blankRow(studentId, classId, subjectId, schoolYear);
    grades.push(record);
  }
  record[periodDef.field] = cleared ? null : Number(value);
  record.finalGrade = computeFinalGradeForLevel(gradeLevel, record);
  persist();
  return enrichGradeRow(record);
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

function seedGradeRowsForStudent(student, classId, schoolYear = ACTIVE_SCHOOL_YEAR) {
  const cls = getClassById(classId);
  if (!cls) return;
  const subjectIds = TEACHING_ASSIGNMENTS.filter((a) => a.classId === classId).map((a) => a.subjectId);
  for (const subjectId of subjectIds) {
    if (!findGradeRecord(student.studentId, classId, subjectId, schoolYear)) {
      grades.push(blankRow(student.studentId, classId, subjectId, schoolYear));
    }
  }
  persist();
}

export class StudentAccountError extends Error {}

/**
 * Teacher creates a student account and auto-assigns them to the selected section.
 */
export async function createStudentAccount({
  lrn,
  lastName,
  firstName,
  middleName,
  nameExtension,
  birthdate,
  sex,
  gradeLevel,
  section,
  schoolYear = ACTIVE_SCHOOL_YEAR,
  password,
}) {
  const cls = findClassByGradeAndSection(gradeLevel, section, schoolYear);
  if (!cls) {
    throw new StudentAccountError(`No class found for ${gradeLevel} - ${section} (${schoolYear}).`);
  }

  if (isSupabaseConfigured()) {
    try {
      const student = await createStudentInDb({
        lrn,
        lastName,
        firstName,
        middleName,
        nameExtension,
        birthdate,
        sex,
        classId: cls.id,
        password,
      });
      addStudentToCache(student);
      const { grades: dbGrades } = await hydrateAllFromDb();
      grades = dbGrades;
      persist();
      return { student, class: cls };
    } catch (err) {
      throw new StudentAccountError(err.message);
    }
  }

  let student;
  try {
    student = createStudent({
      lrn,
      lastName,
      firstName,
      middleName,
      nameExtension,
      birthdate,
      sex,
      classId: cls.id,
      password,
    });
  } catch (err) {
    if (err instanceof StudentValidationError) throw new StudentAccountError(err.message);
    throw err;
  }

  seedGradeRowsForStudent(student, cls.id, schoolYear);
  return { student, class: cls };
}

export function getStudentDashboardSummary(studentId) {
  const student = getStudentById(studentId);
  if (!student) return null;
  const cls = getClassById(student.classId);
  return {
    student,
    classLabel: cls ? getClassLabel(cls.id) : 'Unassigned',
    schoolYear: ACTIVE_SCHOOL_YEAR,
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
    const rows = getClassRecordRows(a.classId, a.subjectId, ACTIVE_SCHOOL_YEAR);
    const hasGap = rows.some((row) => gradeRecordHasGap(gradeLevel, row));
    if (hasGap) pending += 1;
  }

  return {
    teacher,
    schoolYear: ACTIVE_SCHOOL_YEAR,
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
