import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { findStudentByCredentials } from '../data/students.js';
import { findTeacherByCredentials } from '../data/teachers.js';

const AuthContext = createContext(null);
const SESSION_KEY = 'sf10_session_v1';

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage errors; session just will not persist across reloads
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const session = readSession();
    if (session) setUser(session);
    setInitializing(false);
  }, []);

  const login = useCallback(({ role, id, password }) => {
    if (role === 'student') {
      const student = findStudentByCredentials(id.trim(), password);
      if (!student) return { ok: false, message: 'Invalid LRN or password.' };
      const session = { role: 'student', id: student.studentId, name: student.name };
      setUser(session);
      writeSession(session);
      return { ok: true };
    }
    if (role === 'teacher') {
      const teacher = findTeacherByCredentials(id.trim(), password);
      if (!teacher) return { ok: false, message: 'Invalid Teacher ID/email or password.' };
      const session = { role: 'teacher', id: teacher.teacherId, name: teacher.name };
      setUser(session);
      writeSession(session);
      return { ok: true };
    }
    return { ok: false, message: 'Unknown role.' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    writeSession(null);
  }, []);

  const value = useMemo(() => ({ user, initializing, login, logout }), [user, initializing, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
