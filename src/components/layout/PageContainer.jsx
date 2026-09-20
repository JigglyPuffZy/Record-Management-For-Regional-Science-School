import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils.js';

export default function PageContainer({ title, description, icon: Icon, actions, children, className, wide }) {
  return (
    <div className={cn('page-enter py-5 sm:py-6', wide ? 'max-w-none' : 'max-w-7xl mx-auto', className)}>
      {(title || actions) ? (
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {Icon ? (
              <span className="icon-well-md flex-shrink-0">
                <Icon className="h-5 w-5" />
              </span>
            ) : null}
            <div>
              {title ? <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1> : null}
              {description ? <p className="mt-1 max-w-xl text-sm text-slate-500">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}

/** Bento grid tile — used on dashboards */
export function BentoTile({ className, children, as = 'div', to, onClick, ...props }) {
  const base = cn('bento-tile', className);
  if (as === 'link' && to) {
    return <Link to={to} className={cn(base, 'block')} {...props}>{children}</Link>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className={cn(base, 'w-full text-left')} {...props}>{children}</button>;
  }
  return <div className={base} {...props}>{children}</div>;
}
