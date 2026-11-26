import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import { apiPost } from '../../lib/api.js';

export default function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const container = useRef(null);
  const button = useRef(null);
  const location = useLocation();

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    apiPost('/api/admin', { action: 'notifications' }).then(result => {
      if (!disposed) { setData(result); setError(''); }
    }).catch(err => {
      if (!disposed) setError(err.message);
    }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [refresh]);

  useEffect(() => {
    const update = () => {
      if (document.visibilityState !== 'hidden') setRefresh(value => value + 1);
    };
    const timer = window.setInterval(update, 30000);
    window.addEventListener('focus', update);
    window.addEventListener('admin-accounts-updated', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      window.removeEventListener('admin-accounts-updated', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  useEffect(() => { setOpen(false); }, [location.key]);
  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!container.current?.contains(event.target)) setOpen(false);
    };
    const escape = event => {
      if (event.key === 'Escape') { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return <div className="relative" ref={container}>
    <button ref={button} type="button" aria-label={`Notifications${data.total ? `, ${data.total} pending registrations` : ''}`}
      aria-expanded={open} aria-controls="admin-notifications"
      onClick={() => { if (!open) setRefresh(value => value + 1); setOpen(value => !value); }}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
      <Bell className="h-[18px] w-[18px]"/>
      {data.total > 0 && <span aria-hidden="true" className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{data.total > 99 ? '99+' : data.total}</span>}
    </button>
    {open && <section id="admin-notifications" aria-label="Admin notifications" className="absolute -right-12 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:right-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
        <button type="button" aria-label="Refresh notifications" disabled={loading} onClick={() => setRefresh(value => value + 1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button>
      </div>
      {error ? <p role="alert" className="px-4 py-4 text-sm text-rose-700">Could not refresh notifications. {error} Use Refresh to retry.</p>
        : loading && !data.notifications.length ? <p role="status" className="px-4 py-5 text-sm text-slate-500">Loading notifications…</p>
        : !data.total ? <p role="status" className="px-4 py-5 text-sm text-slate-500">You’re all caught up. No registrations are awaiting approval.</p>
        : <>
          <p className="px-4 py-2 text-xs font-medium text-slate-500">{data.total} registration{data.total === 1 ? '' : 's'} awaiting approval</p>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">{data.notifications.map(item => <li key={item.id}>
            <Link to={`/admin/registrations?registration=${encodeURIComponent(item.id)}`} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-brand-50 focus-visible:bg-brand-50">
              <span className="block text-sm font-semibold text-slate-900">{item.name}</span>
              <span className="block text-xs text-slate-600">{item.role === 'teacher' ? 'Teacher' : 'Student'} registration · Review account</span>
            </Link>
          </li>)}</ul>
        </>}
      <Link to="/admin/registrations" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50">View all registrations</Link>
    </section>}
  </div>;
}
