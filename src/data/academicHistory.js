import { INITIAL_STUDENTS } from './students.js';
import { SUBJECTS } from './subjects.js';
import { SCHOOL } from './schools.js';
import { seededGrade } from './mockGradeGenerator.js';
import { computeFinalGrade } from '../lib/utils.js';

const SCHOOL_META = {
  school: SCHOOL.name,
  schoolId: SCHOOL.schoolId,
  district: SCHOOL.district,
  division: SCHOOL.division,
  region: SCHOOL.region,
};

function buildSubjectRows(studentId, schoolYear) {
  return SUBJECTS.map((subject) => {
    const q1 = seededGrade(`${studentId}-${subject.id}-${schoolYear}-q1`, 80, 95);
    const q2 = seededGrade(`${studentId}-${subject.id}-${schoolYear}-q2`, 80, 95);
    const q3 = seededGrade(`${studentId}-${subject.id}-${schoolYear}-q3`, 80, 95);
    const q4 = seededGrade(`${studentId}-${subject.id}-${schoolYear}-q4`, 80, 95);
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      quarter1: q1,
      quarter2: q2,
      quarter3: q3,
      quarter4: q4,
      finalGrade: computeFinalGrade(q1, q2, q3, q4),
    };
  });
}

function grade7Record(studentId) {
  return {
    ...SCHOOL_META,
    schoolYear: '2023-2024',
    gradeLevel: 'Grade 7',
    section: 'Rizal',
    adviser: 'Edgar Cruz',
    subjects: buildSubjectRows(studentId, '2023-2024'),
    remedialClasses: [],
  };
}

function grade8Record(studentId) {
  const subjects = buildSubjectRows(studentId, '2024-2025');
  let remedialClasses = [];
  if (studentId === '2026-001') {
    const tle = subjects.find((s) => s.subjectId === 'TLE');
    if (tle) {
      tle.quarter1 = 72;
      tle.quarter2 = 74;
      tle.quarter3 = 71;
      tle.quarter4 = 73;
      tle.finalGrade = computeFinalGrade(72, 74, 71, 73);
      remedialClasses = [
        {
          subjectId: 'TLE',
          learningArea: 'Technology and Livelihood Education (TLE)',
          finalRating: tle.finalGrade,
          remedialClassMark: 82,
          recomputedFinalGrade: Math.round((tle.finalGrade + 82) / 2),
          conductedFrom: '2025-04-07',
          conductedTo: '2025-04-25',
        },
      ];
    }
  }
  return {
    ...SCHOOL_META,
    schoolYear: '2024-2025',
    gradeLevel: 'Grade 8',
    section: 'Bonifacio',
    adviser: 'Liza Fernandez',
    subjects,
    remedialClasses,
  };
}

function grade9Record(studentId) {
  return {
    ...SCHOOL_META,
    schoolYear: '2025-2026',
    gradeLevel: 'Grade 9',
    section: 'Mabini',
    adviser: 'Ramon Santos',
    subjects: buildSubjectRows(studentId, '2025-2026'),
    remedialClasses: [],
  };
}

function buildAcademicHistory() {
  const history = {};
  for (const student of INITIAL_STUDENTS) {
    if (student.classId === 'G10-RIZAL') {
      history[student.studentId] = [
        grade7Record(student.studentId),
        grade8Record(student.studentId),
        grade9Record(student.studentId),
      ];
    } else if (student.classId === 'G8-BONIFACIO') {
      history[student.studentId] = [grade7Record(student.studentId)];
    } else {
      history[student.studentId] = [];
    }
  }
  return history;
}

export const ACADEMIC_HISTORY = buildAcademicHistory();

export function getAcademicHistoryForStudent(studentId) {
  return ACADEMIC_HISTORY[studentId] ?? [];
}
