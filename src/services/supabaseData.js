import { apiPost } from '../lib/api.js';

export async function hydrateAllFromDb() {
  const data = await apiPost('/api/records');
  return {
    archives: data.archives || [], archivedGrades: data.archivedGrades || [], remedials: data.remedials || [],
    eligibility: data.eligibility || [], schoolYears: data.schoolYears || [], workflowsReady: data.workflowsReady,
    classes: data.classes.map(row => ({ id: row.id, gradeLevel: row.grade_level, section: row.section, schoolYear: row.school_year_id, adviserId: row.adviser_teacher_id })),
    assignments: data.assignments.map(row => ({ teacherId: row.teacher_id, classId: row.class_id, subjectId: row.subject_id })),
    teachers: data.teachers.map(row => ({ teacherId: row.teacher_id, name: row.name, email: row.email, position: row.position })),
    students: data.students.map(row => ({ studentId: row.student_id, lrn: row.lrn, lastName: row.last_name, firstName: row.first_name, middleName: row.middle_name, nameExtension: row.name_extension, name: row.display_name, sex: row.sex, birthdate: row.birthdate, classId: row.class_id, status: row.status })),
    grades: data.grades.map(row => ({ studentId: row.student_id, classId: row.class_id, subjectId: row.subject_id, schoolYear: row.school_year_id, gradeLevel: row.grade_level, quarter1: row.quarter1 == null ? null : Number(row.quarter1), quarter2: row.quarter2 == null ? null : Number(row.quarter2), quarter3: row.quarter3 == null ? null : Number(row.quarter3), quarter4: row.quarter4 == null ? null : Number(row.quarter4), finalGrade: row.final_grade == null ? null : Number(row.final_grade) })),
  };
}
export const saveGradeInDb = payload => apiPost('/api/save-grade', payload);
