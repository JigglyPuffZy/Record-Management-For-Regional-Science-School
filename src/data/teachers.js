// Authorized teacher metadata loaded from the server after sign-in.

export let TEACHERS = [];
export function setTeachersCache(teachers) { TEACHERS = teachers; }

export function getTeacherById(teacherId) {
  return TEACHERS.find((t) => t.teacherId === teacherId) ?? null;
}
