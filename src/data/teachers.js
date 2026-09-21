// Teacher profile metadata for UI (login is via Supabase login_teacher RPC).
// Must match supabase/cleanup_single_teacher.sql

export const TEACHERS = [
  {
    teacherId: 'T-ADMIN',
    name: 'Maria Santos',
    email: 'admin@bpans.edu.ph',
    position: 'Teacher III — System Administrator',
    adviserOfClassId: 'G10-RIZAL',
  },
];

export function getTeacherById(teacherId) {
  return TEACHERS.find((t) => t.teacherId === teacherId) ?? null;
}

export function findTeacherByCredentials(idOrEmail, password) {
  return null;
}
