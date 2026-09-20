import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Bell, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getActiveSchoolYear } from '../../services/academicRecords.js';
import { getNavForRole } from './navConfig.js';
import { initials, cn } from '../../lib/utils.js';

export default function TopBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const schoolYear = getActiveSchoolYear();

  const currentPage = getNavForRole(user?.role).find(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const home = user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link to={home} className="flex min-w-0 items-center gap-3">
          <span className="icon-well-sm bg-brand-700 text-white">
            <GraduationCap className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 hidden sm:block">
            <p className="truncate text-sm font-bold text-slate-900">SF10 Records</p>
            <p className="truncate text-[11px] text-slate-500">SY {schoolYear}</p>
          </div>
        </Link>

        <p className="truncate text-sm font-semibold text-slate-800">
          {currentPage?.label ?? 'Workspace'}
        </p>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Notifications"
          >
            <Bell className="h-[17px] w-[17px]" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-600" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-slate-100"
            >
              <span className="avatar-well h-8 w-8 text-xs">
                {initials(user?.name ?? '?')}
              </span>
              <ChevronDown className={cn('hidden h-4 w-4 text-slate-400 sm:block', menuOpen && 'rotate-180')} />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.id}</p>
                </div>
                <Link
                  to={user?.role === 'teacher' ? '/teacher/profile' : '/student/profile'}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Profile
                </Link>
                <Link
                  to={user?.role === 'teacher' ? '/teacher/settings' : '/student/settings'}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
