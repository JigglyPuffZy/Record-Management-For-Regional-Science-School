import { cn } from '../../lib/utils.js';

const VARIANTS = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-600 active:bg-brand-800 disabled:bg-slate-200 disabled:text-slate-400',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:text-slate-400',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300',
  subtle:
    'bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100 disabled:text-brand-300',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  icon: Icon,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors duration-150 disabled:cursor-not-allowed active:scale-[0.98]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
