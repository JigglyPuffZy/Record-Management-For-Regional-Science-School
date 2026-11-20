import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { apiPost } from '../lib/api.js';
import { hydrateRecords, clearRecords } from '../services/academicRecords.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const loadData = useCallback(async (account) => {
    setLoadError('');
    setDataReady(false);
    try {
      if (account.role !== 'admin') await hydrateRecords();
      setDataReady(true);
    } catch (err) { setLoadError(err.message); }
  }, []);
  useEffect(() => {
    localStorage.removeItem('sf10_session_v1');
    apiPost('/api/access', { action: 'session' }).then(async ({ user: account }) => {
      setUser(account);
      await loadData(account);
    }).catch((err) => {
      if (err.status !== 401 && err.status !== 403) setLoadError(err.message);
    }).finally(() => setInitializing(false));
  }, [loadData]);
  const login = useCallback(async (credentials) => {
    try {
      const { user: account } = await apiPost('/api/access', { action: 'login', ...credentials });
      clearRecords();
      setUser(account);
      await loadData(account);
      return { ok: true, role: account.role };
    } catch (err) { return { ok: false, message: err.message }; }
  }, [loadData]);
  const logout = useCallback(async () => {
    await apiPost('/api/access', { action: 'logout' });
    clearRecords();
    setUser(null);
    setDataReady(false);
    setLoadError('');
  }, []);
  const reloadData = useCallback(() => user && loadData(user), [user, loadData]);
  const value = useMemo(() => ({ user, initializing, dataReady, loadError, login, logout, reloadData }), [user, initializing, dataReady, loadError, login, logout, reloadData]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
