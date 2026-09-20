import { cn } from '../../lib/utils.js';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('surface-card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4', className)}>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', hint, trend }) {
  const iconTones = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
  };

  return (
    <div className="surface-card p-5 transition-shadow duration-200 hover:shadow-md hover:shadow-slate-900/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
          {trend ? <p className="mt-1 text-xs font-medium text-brand-600">{trend}</p> : null}
        </div>
        {Icon ? (
          <span className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', iconTones[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
