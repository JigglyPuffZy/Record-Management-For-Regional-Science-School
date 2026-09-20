import { cn } from '../../lib/utils.js';

export default function Input({ label, error, className, id, icon: Icon, hint, ...props }) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /> : null}
        <input
          id={inputId}
          className={cn(
            'h-10 w-full rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400',
            'border-slate-200 shadow-sm transition-all',
            'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
            Icon ? 'pl-10 pr-3' : 'px-3.5',
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : '',
            className,
          )}
          {...props}
        />
      </div>
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
