// Mock student accounts. `password` is plain text for demo purposes only.
// Students log in with their LRN (see findStudentByCredentials).

export const INITIAL_STUDENTS = [
  // Grade 10 - Rizal (current SY 2026-2027) — promoted cohort with G7–G9 history on file
  { studentId: '2026-001', lrn: '136045210001', lastName: 'Dela Cruz', firstName: 'Juan', middleName: 'Ramos', nameExtension: '', name: 'Juan Dela Cruz', sex: 'Male', birthdate: '2011-03-14', classId: 'G10-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-002', lrn: '136045210002', lastName: 'Santos', firstName: 'Maria', middleName: 'Reyes', nameExtension: '', name: 'Maria Santos', sex: 'Female', birthdate: '2011-07-22', classId: 'G10-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-003', lrn: '136045210003', lastName: 'Reyes', firstName: 'Pedro', middleName: 'Garcia', nameExtension: '', name: 'Pedro Reyes', sex: 'Male', birthdate: '2011-01-30', classId: 'G10-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-004', lrn: '136045210004', lastName: 'Garcia', firstName: 'Ana', middleName: 'Torres', nameExtension: '', name: 'Ana Garcia', sex: 'Female', birthdate: '2011-11-05', classId: 'G10-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-005', lrn: '136045210005', lastName: 'Mendoza', firstName: 'Carlo', middleName: 'Bautista', nameExtension: '', name: 'Carlo Mendoza', sex: 'Male', birthdate: '2011-05-18', classId: 'G10-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-006', lrn: '136045210006', lastName: 'Ramos', firstName: 'Isabel', middleName: 'Cruz', nameExtension: '', name: 'Isabel Ramos', sex: 'Female', birthdate: '2011-09-09', classId: 'G10-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-007', lrn: '136045210007', lastName: 'Torres', firstName: 'Miguel', middleName: 'Villareal', nameExtension: 'Jr.', name: 'Miguel Torres Jr.', sex: 'Male', birthdate: '2011-02-27', classId: 'G10-RIZAL', password: 'student123', status: 'Active' },
  // Grade 8 - Bonifacio
  { studentId: '2026-008', lrn: '136045210008', lastName: 'Bautista', firstName: 'Katrina', middleName: 'Domingo', nameExtension: '', name: 'Katrina Bautista', sex: 'Female', birthdate: '2012-04-11', classId: 'G8-BONIFACIO', password: 'student123', status: 'Active' },
  { studentId: '2026-009', lrn: '136045210009', lastName: 'Villareal', firstName: 'Joshua', middleName: 'Aquino', nameExtension: '', name: 'Joshua Villareal', sex: 'Male', birthdate: '2012-08-19', classId: 'G8-BONIFACIO', password: 'student123', status: 'Active' },
  { studentId: '2026-010', lrn: '136045210010', lastName: 'Domingo', firstName: 'Angelica', middleName: 'Castro', nameExtension: '', name: 'Angelica Domingo', sex: 'Female', birthdate: '2012-12-02', classId: 'G8-BONIFACIO', password: 'student123', status: 'Active' },
  { studentId: '2026-011', lrn: '136045210011', lastName: 'Aquino', firstName: 'Rafael', middleName: 'Lim', nameExtension: '', name: 'Rafael Aquino', sex: 'Male', birthdate: '2012-06-25', classId: 'G8-BONIFACIO', password: 'student123', status: 'Active' },
  { studentId: '2026-012', lrn: '136045210012', lastName: 'Castro', firstName: 'Bianca', middleName: 'Bautista', nameExtension: '', name: 'Bianca Castro', sex: 'Female', birthdate: '2012-10-14', classId: 'G8-BONIFACIO', password: 'student123', status: 'Active' },
  { studentId: '2026-013', lrn: '136045210013', lastName: 'Lim', firstName: 'Vincent', middleName: 'Santos', nameExtension: '', name: 'Vincent Lim', sex: 'Male', birthdate: '2012-03-08', classId: 'G8-BONIFACIO', password: 'student123', status: 'Active' },
  // Grade 7 - Rizal
  { studentId: '2026-014', lrn: '136045210014', lastName: 'Ocampo', firstName: 'Nicole', middleName: 'Salazar', nameExtension: '', name: 'Nicole Ocampo', sex: 'Female', birthdate: '2013-01-17', classId: 'G7-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-015', lrn: '136045210015', lastName: 'Salazar', firstName: 'Gabriel', middleName: 'Marquez', nameExtension: '', name: 'Gabriel Salazar', sex: 'Male', birthdate: '2013-05-23', classId: 'G7-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-016', lrn: '136045210016', lastName: 'Marquez', firstName: 'Trisha', middleName: 'Padilla', nameExtension: '', name: 'Trisha Marquez', sex: 'Female', birthdate: '2013-09-30', classId: 'G7-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-017', lrn: '136045210017', lastName: 'Padilla', firstName: 'Emmanuel', middleName: 'Reyes', nameExtension: '', name: 'Emmanuel Padilla', sex: 'Male', birthdate: '2013-02-14', classId: 'G7-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-018', lrn: '136045210018', lastName: 'Reyes', firstName: 'Samantha', middleName: 'Aguilar', nameExtension: '', name: 'Samantha Reyes', sex: 'Female', birthdate: '2013-07-08', classId: 'G7-RIZAL', password: 'student123', status: 'Active' },
  { studentId: '2026-019', lrn: '136045210019', lastName: 'Aguilar', firstName: 'Kevin', middleName: 'Ocampo', nameExtension: '', name: 'Kevin Aguilar', sex: 'Male', birthdate: '2013-11-21', classId: 'G7-RIZAL', password: 'student123', status: 'Active' },
];

const STORAGE_KEY = 'sf10_students_v2';

function loadStudents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through
  }
  return structuredClone(INITIAL_STUDENTS);
}

let students = loadStudents();
const listeners = new Set();

function persistStudents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn());
}

export function subscribeToStudents(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetStudentsData() {
  students = structuredClone(INITIAL_STUDENTS);
  persistStudents();
}

export function getAllStudents() {
  return students;
}

export function getStudentById(studentId) {
  return students.find((s) => s.studentId === studentId) ?? null;
}

export function getStudentByLrn(lrn) {
  const needle = String(lrn).trim();
  return students.find((s) => s.lrn === needle) ?? null;
}

export function getStudentsByClass(classId) {
  return students.filter((s) => s.classId === classId);
}

/** Student login: LRN + password. */
export function findStudentByCredentials(lrn, password) {
  const needle = String(lrn).trim();
  return students.find((s) => s.lrn === needle && s.password === password) ?? null;
}

function buildDisplayName({ lastName, firstName, middleName, nameExtension }) {
  const ext = nameExtension ? ` ${nameExtension}` : '';
  return `${firstName} ${middleName ? `${middleName} ` : ''}${lastName}${ext}`.replace(/\s+/g, ' ').trim();
}

let nextStudentSeq = () => {
  const max = students.reduce((m, s) => {
    const n = Number(s.studentId.split('-')[1]);
    return n > m ? n : m;
  }, 0);
  return max + 1;
};

export class StudentValidationError extends Error {}

export function createStudent({
  lrn,
  lastName,
  firstName,
  middleName = '',
  nameExtension = '',
  birthdate,
  sex,
  classId,
  password,
  status = 'Active',
}) {
  const trimmedLrn = String(lrn).trim();
  if (!trimmedLrn) throw new StudentValidationError('LRN is required.');
  if (getStudentByLrn(trimmedLrn)) throw new StudentValidationError('An account with this LRN already exists.');
  if (!lastName?.trim() || !firstName?.trim()) throw new StudentValidationError('Last name and first name are required.');
  if (!classId) throw new StudentValidationError('Section assignment is required.');
  if (!password || password.length < 6) throw new StudentValidationError('Password must be at least 6 characters.');

  const seq = nextStudentSeq();
  const studentId = `2026-${String(seq).padStart(3, '0')}`;
  const student = {
    studentId,
    lrn: trimmedLrn,
    lastName: lastName.trim(),
    firstName: firstName.trim(),
    middleName: middleName.trim(),
    nameExtension: nameExtension.trim(),
    name: buildDisplayName({ lastName, firstName, middleName, nameExtension }),
    sex,
    birthdate,
    classId,
    password,
    status,
  };
  students.push(student);
  persistStudents();
  return student;
}
