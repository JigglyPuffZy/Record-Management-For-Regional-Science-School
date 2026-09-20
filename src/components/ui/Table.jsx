import { cn } from '../../lib/utils.js';

export function Table({ children, className }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80">
      <table className={cn('w-full min-w-max text-left text-sm', className)}>{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </thead>
  );
}

export function TBody({ children }) {
  return (
    <tbody className="divide-y divide-slate-100 bg-white [&>tr]:transition-colors [&>tr:hover]:bg-slate-50/60">
      {children}
    </tbody>
  );
}

export function Th({ children, className, align = 'left' }) {
  return (
    <th className={cn('px-4 py-3.5 font-semibold', align === 'right' ? 'text-right' : 'text-left', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, align = 'left' }) {
  return (
    <td className={cn('px-4 py-3.5 text-slate-600', align === 'right' ? 'text-right' : 'text-left', className)}>
      {children}
    </td>
  );
}
