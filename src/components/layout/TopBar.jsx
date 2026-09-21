import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, LogOut, ChevronDown } from 'lucide-react';
import AppLogo from '../ui/AppLogo.jsx';
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

  const pageLabel = currentPage?.label ?? (
    location.pathname.includes('/profile') ? 'Profile'
      : location.pathname.includes('/settings') ? 'Settings'
        : location.pathname.includes('/create') ? 'Create Student'
          : 'Workspace'
  );

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [menuOpen]);

  const home = user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-sm pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-3">
          <Link to={home} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              <AppLogo className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">SF10 Records</p>
              <p className="truncate text-[11px] text-slate-500">SY {schoolYear}</p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-brand-600" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-11 items-center gap-1.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-slate-100"
                aria-label="Account menu"
              >
                <span className="avatar-well h-9 w-9 text-xs">
                  {initials(user?.name ?? '?')}
                </span>
                <ChevronDown className={cn('hidden h-4 w-4 text-slate-400 sm:block', menuOpen && 'rotate-180')} />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.id}</p>
                  </div>
                  <Link
                    to={user?.role === 'teacher' ? '/teacher/profile' : '/student/profile'}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Profile
                  </Link>
                  <Link
                    to={user?.role === 'teacher' ? '/teacher/settings' : '/student/settings'}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="flex w-full items-center gap-2 px-3 py-3 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <p className="mt-2 truncate text-center text-xs font-semibold text-slate-600 sm:hidden">
          {pageLabel}
        </p>
      </div>
    </header>
  );
}
