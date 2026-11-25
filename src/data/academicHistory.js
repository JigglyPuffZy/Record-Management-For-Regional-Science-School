import { getCurriculumForGradeLevel } from './curriculum.js';
import { getDescriptorForGradeLevel } from '../lib/grading.js';

let records = [];
export function setAcademicHistoryCache(value) { records = value; }
export function getAcademicHistoryForStudent(studentId) {
  return records.filter(row => row.studentId === studentId);
}

// Canonical grade records override snapshots, including corrections made after closing a year.
export function buildAcademicHistory({ grades, classes, teachers, subjects, archives = [], archivedGrades = [], remedials = [], school = {} }) {
  const years = new Map();
  for (const row of archives) {
    years.set(`${row.student_id}:${row.school_year_id}`, {
      studentId: row.student_id, schoolYear: row.school_year_id, gradeLevel: row.grade_level,
      section: row.section, adviser: row.adviser_name, school: row.school_name,
      schoolId: row.school_dep_id, district: row.district, division: row.division, region: row.region,
      archiveId: row.id, subjects: archivedGrades.filter(g => g.academic_year_record_id === row.id).map(g => ({
        subjectId: g.subject_id, subjectName: g.subject_name, quarter1: g.quarter1, quarter2: g.quarter2,
        quarter3: g.quarter3, quarter4: g.quarter4, finalGrade: g.final_grade,
      })),
      remedialClasses: remedials.filter(r => r.academic_year_record_id === row.id).map(r => ({
        subjectId: r.subject_id, learningArea: r.learning_area, finalRating: r.final_rating,
        remedialClassMark: r.remedial_class_mark, recomputedFinalGrade: r.recomputed_final_grade,
        conductedFrom: r.conducted_from, conductedTo: r.conducted_to,
      })),
    });
  }
  for (const grade of grades) {
    const key = `${grade.studentId}:${grade.schoolYear}`;
    const cls = classes.find(c => c.id === grade.classId);
    if (!years.has(key)) years.set(key, {
      studentId: grade.studentId, schoolYear: grade.schoolYear, gradeLevel: grade.gradeLevel || cls?.gradeLevel,
      section: cls?.section || '', adviser: teachers.find(t => t.teacherId === cls?.adviserId)?.name || 'Unassigned',
      school: school.name, schoolId: school.schoolId, district: school.district, division: school.division,
      region: school.region, subjects: [], remedialClasses: [],
    });
    const year = years.get(key);
    const subject = { ...grade, subjectName: subjects.find(s => s.id === grade.subjectId)?.name || grade.subjectId };
    const index = year.subjects.findIndex(s => s.subjectId === grade.subjectId);
    if (index < 0) year.subjects.push(subject); else year.subjects[index] = subject;
  }
  return [...years.values()].map(year => {
    const curriculum = getCurriculumForGradeLevel(year.gradeLevel);
    const complete = year.subjects.length > 0 && year.subjects.every(s => s.finalGrade != null);
    return { ...year, ...curriculum, gradingPeriods: curriculum.periods,
      generalAverage: complete ? Math.round(year.subjects.reduce((sum, s) => sum + Number(s.finalGrade), 0) / year.subjects.length) : null,
      subjects: year.subjects.map(s => ({ ...s, ...getDescriptorForGradeLevel(year.gradeLevel, s.finalGrade) })),
    };
  }).sort((a, b) => Number(a.gradeLevel?.replace('Grade ', '')) - Number(b.gradeLevel?.replace('Grade ', '')) || a.schoolYear.localeCompare(b.schoolYear));
}
