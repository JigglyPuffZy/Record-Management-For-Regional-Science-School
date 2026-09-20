import { ACTIVE_SCHOOL_YEAR } from './schools.js';
import { INITIAL_STUDENTS } from './students.js';
import { CLASSES, TEACHING_ASSIGNMENTS } from './classes.js';
import { seededGrade } from './mockGradeGenerator.js';
import { computeFinalGradeForLevel } from './curriculum.js';

function buildInitialGrades() {
  const records = [];
  for (const cls of CLASSES) {
    const roster = INITIAL_STUDENTS.filter((s) => s.classId === cls.id);
    const subjectIds = TEACHING_ASSIGNMENTS.filter((a) => a.classId === cls.id).map((a) => a.subjectId);
    const isGrade10 = cls.gradeLevel === 'Grade 10';

    for (const subjectId of subjectIds) {
      for (const student of roster) {
        const quarter1 = seededGrade(`${student.studentId}-${subjectId}-p1`);
        const row = {
          studentId: student.studentId,
          classId: cls.id,
          subjectId,
          schoolYear: ACTIVE_SCHOOL_YEAR,
          gradeLevel: cls.gradeLevel,
          quarter1,
          quarter2: null,
          quarter3: null,
          quarter4: isGrade10 ? null : null,
          finalGrade: null,
        };
        row.finalGrade = computeFinalGradeForLevel(cls.gradeLevel, row);
        records.push(row);
      }
    }
  }
  return records;
}

export const INITIAL_GRADES = buildInitialGrades();
