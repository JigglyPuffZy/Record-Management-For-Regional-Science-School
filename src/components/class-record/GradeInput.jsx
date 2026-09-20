import { cn } from '../../lib/utils.js';

export default function GradeInput({ value, onChange, invalid, disabled, ariaLabel }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="—"
      className={cn(
        'h-9 w-[4.5rem] rounded-xl border text-center text-sm font-semibold tabular-nums shadow-sm transition-all',
        'focus:outline-none focus:ring-4',
        disabled ? 'border-slate-200 bg-slate-50 text-slate-400' : 'bg-white text-slate-900',
        invalid
          ? 'border-rose-400 text-rose-600 focus:border-rose-500 focus:ring-rose-500/10'
          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/10',
      )}
    />
  );
}
