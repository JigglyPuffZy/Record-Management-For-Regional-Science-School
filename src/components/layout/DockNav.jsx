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
      className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:pb-5"
    >
      <div
        className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 scrollbar-thin sm:gap-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={cn(
                'flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-colors sm:min-w-[4rem] sm:px-3.5',
                active
                  ? 'bg-brand-700 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
              <span className="text-[10px] font-semibold leading-none sm:text-[11px]">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
