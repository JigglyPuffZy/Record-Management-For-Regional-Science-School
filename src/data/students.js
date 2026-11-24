// Authorized learner profiles loaded from the server. Passwords are never cached.
let students = [];

export function setStudentsCache(rows) {
  students = rows ?? [];
}

export function getStudentById(studentId) {
  return students.find(student => student.studentId === studentId) ?? null;
}

export function getStudentsByClass(classId) {
  return students.filter(student => student.classId === classId);
}
