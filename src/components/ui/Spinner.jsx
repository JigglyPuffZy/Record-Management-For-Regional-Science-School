import { cn } from '../../lib/utils.js';

export default function Spinner({ className, label = 'Loading...' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)} role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600" />
      {label ? <p className="text-sm text-slate-500">{label}</p> : null}
    </div>
  );
}
