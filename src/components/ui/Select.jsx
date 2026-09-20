import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export default function Select({ label, className, id, name, options, placeholder, hint, ...props }) {
  const selectId = id ?? name;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={selectId} className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          name={name}
          className={cn(
            'h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-3.5 pr-10 text-sm text-slate-900 shadow-sm',
            'transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
            className,
          )}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
