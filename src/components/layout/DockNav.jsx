import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getNavForRole } from './navConfig.js';
import { cn } from '../../lib/utils.js';

export default function DockNav() {
  const { user } = useAuth();
  const location = useLocation();
  const items = getNavForRole(user?.role);

  return (
    <nav
      aria-label="Main navigation"
      className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"
    >
      <div
        className="pointer-events-auto flex w-full max-w-lg items-stretch justify-between gap-0.5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg shadow-slate-900/10 backdrop-blur-sm sm:max-w-xl sm:gap-1"
      >
        {items.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={cn(
                'flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors sm:px-2',
                active
                  ? 'bg-brand-700 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 2} />
              <span className="max-w-full truncate text-[10px] font-semibold leading-none sm:text-[11px]">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
