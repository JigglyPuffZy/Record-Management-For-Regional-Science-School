import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { findStudentByCredentials } from '../data/students.js';
import { findTeacherByCredentials, getTeacherById } from '../data/teachers.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { hydrateRecords } from '../services/academicRecords.js';

const AuthContext = createContext(null);
const SESSION_KEY = 'sf10_session_v1';

function normalizeSession(session) {
  if (!session) return null;
  if (session.role === 'teacher') {
    const teacher = getTeacherById(session.id);
    if (teacher?.name) return { ...session, name: teacher.name };
  }
  return session;
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? normalizeSession(JSON.parse(raw)) : null;
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

async function loginViaSupabase(role, id, password) {
  if (role === 'student') {
    const { data, error } = await supabase.rpc('login_student', {
      p_lrn: id.trim(),
      p_password: password,
    });
    if (error) return { ok: false, message: 'Could not reach the server. Please try again.' };
    if (!data?.length) return { ok: false, message: 'Invalid LRN or password.' };
    const row = data[0];
    return {
      ok: true,
      session: { role: 'student', id: row.student_id, name: row.display_name },
    };
  }

  if (role === 'teacher') {
    const { data, error } = await supabase.rpc('login_teacher', {
      p_id_or_email: id.trim(),
      p_password: password,
    });
    if (error) return { ok: false, message: 'Could not reach the server. Please try again.' };
    if (!data?.length) return { ok: false, message: 'Invalid Teacher ID/email or password.' };
    const row = data[0];
    const teacher = getTeacherById(row.teacher_id);
    return {
      ok: true,
      session: {
        role: 'teacher',
        id: row.teacher_id,
        name: teacher?.name ?? row.display_name,
      },
    };
  }

  return { ok: false, message: 'Unknown role.' };
}

function loginViaLocal(role, id, password) {
  if (role === 'student') {
    const student = findStudentByCredentials(id.trim(), password);
    if (!student) return { ok: false, message: 'Invalid LRN or password.' };
    return {
      ok: true,
      session: { role: 'student', id: student.studentId, name: student.name },
    };
  }
  if (role === 'teacher') {
    const teacher = findTeacherByCredentials(id.trim(), password);
    if (!teacher) return { ok: false, message: 'Invalid Teacher ID/email or password.' };
    return {
      ok: true,
      session: { role: 'teacher', id: teacher.teacherId, name: teacher.name },
    };
  }
  return { ok: false, message: 'Unknown role.' };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [dataReady, setDataReady] = useState(!isSupabaseConfigured());

  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setDataReady(true);
      return;
    }
    setDataReady(false);
    try {
      await hydrateRecords();
    } catch (err) {
      console.error('Failed to load records from Supabase:', err);
    } finally {
      setDataReady(true);
    }
  }, []);

  useEffect(() => {
    const session = readSession();
    if (session) {
      setUser(session);
      loadData().finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, [loadData]);

  const login = useCallback(async ({ role, id, password }) => {
    const result = isSupabaseConfigured()
      ? await loginViaSupabase(role, id, password)
      : loginViaLocal(role, id, password);

    if (!result.ok) return result;

    const session = normalizeSession(result.session);
    setUser(session);
    writeSession(session);
    await loadData();
    return { ok: true };
  }, [loadData]);

  const logout = useCallback(() => {
    setUser(null);
    writeSession(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, dataReady, login, logout, reloadData: loadData }),
    [user, initializing, dataReady, login, logout, loadData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
