// Authorized learner profiles loaded from the server. Passwords are never cached.
export const INITIAL_STUDENTS = [];
let students = [];
const listeners = new Set();
export function subscribeToStudents(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function setStudentsCache(rows) {
  students = rows ?? [];
  listeners.forEach(listener => listener());
}
export function getAllStudents() { return students; }
export function getStudentById(studentId) {
  return students.find(student => student.studentId === studentId) ?? null;
}
export function getStudentByLrn(lrn) {
  return students.find(student => student.lrn === String(lrn).trim()) ?? null;
}
export function getStudentsByClass(classId) {
  return students.filter(student => student.classId === classId);
}
