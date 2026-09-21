// Student accounts — Supabase when configured, else localStorage fallback.

import { isSupabaseConfigured } from '../lib/supabase.js';

export const INITIAL_STUDENTS = [];

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

let students = isSupabaseConfigured() ? [] : loadStudents();
const listeners = new Set();

function persistStudents() {
  if (isSupabaseConfigured()) return;
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

export function setStudentsCache(rows) {
  students = rows ?? [];
  listeners.forEach((fn) => fn());
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

export function addStudentToCache(student) {
  const idx = students.findIndex((s) => s.studentId === student.studentId);
  if (idx >= 0) students[idx] = student;
  else students.push(student);
  listeners.forEach((fn) => fn());
}
