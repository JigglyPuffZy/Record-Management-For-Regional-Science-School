import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };

const STYLES = {
  success: { icon: 'text-emerald-600', ring: 'ring-emerald-500/20', bar: 'bg-emerald-500' },
  error: { icon: 'text-rose-600', ring: 'ring-rose-500/20', bar: 'bg-rose-500' },
  info: { icon: 'text-sky-600', ring: 'ring-sky-500/20', bar: 'bg-sky-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message, duration = 4000) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, type, message }]);
      if (duration > 0) setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  const toast = useMemo(
    () => ({
      success: (msg, duration) => push('success', msg, duration),
      error: (msg, duration) => push('error', msg, duration),
      info: (msg, duration) => push('info', msg, duration),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="no-print fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:bottom-6 sm:right-6 sm:px-0">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] ?? Info;
          const style = STYLES[t.type] ?? STYLES.info;
          return (
            <div
              key={t.id}
              role="status"
              className={`relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-xl shadow-slate-900/10 ring-1 ${style.ring}`}
            >
              <div className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${style.bar}`} />
              <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${style.icon}`} />
              <p className="flex-1 text-sm font-medium leading-snug text-slate-700">{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="flex-shrink-0 rounded-lg p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
