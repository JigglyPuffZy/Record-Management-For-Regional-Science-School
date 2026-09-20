// Mock teacher accounts. `password` is plain text for demo purposes only —
// a real deployment must never store or compare credentials like this.
export const TEACHERS = [
  {
    teacherId: 'T-2001',
    name: 'Ramon Santos',
    email: 'ramon.santos@depedqc.edu.ph',
    password: 'teacher123',
    position: 'Teacher III',
    adviserOfClassId: 'G9-MABINI',
  },
  {
    teacherId: 'T-2002',
    name: 'Liza Fernandez',
    email: 'liza.fernandez@depedqc.edu.ph',
    password: 'teacher123',
    position: 'Teacher II',
    adviserOfClassId: 'G8-BONIFACIO',
  },
  {
    teacherId: 'T-2003',
    name: 'Edgar Cruz',
    email: 'edgar.cruz@depedqc.edu.ph',
    password: 'teacher123',
    position: 'Teacher I',
    adviserOfClassId: 'G7-RIZAL',
  },
  {
    teacherId: 'T-2004',
    name: 'Corazon Villanueva',
    email: 'corazon.villanueva@depedqc.edu.ph',
    password: 'teacher123',
    position: 'Teacher II',
    adviserOfClassId: null,
  },
];

export function getTeacherById(teacherId) {
  return TEACHERS.find((t) => t.teacherId === teacherId) ?? null;
}

export function findTeacherByCredentials(idOrEmail, password) {
  const needle = idOrEmail.trim().toLowerCase();
  return (
    TEACHERS.find(
      (t) =>
        (t.teacherId.toLowerCase() === needle || t.email.toLowerCase() === needle) &&
        t.password === password,
    ) ?? null
  );
}
