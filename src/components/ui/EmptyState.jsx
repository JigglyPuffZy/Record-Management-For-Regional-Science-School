export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
      {Icon ? (
        <span className="icon-well-md mb-4 h-14 w-14 text-slate-500">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
