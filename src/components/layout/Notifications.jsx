import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import { apiPost } from '../../lib/api.js';
import { hydrateRecords } from '../../services/academicRecords.js';
import { useToast } from '../../context/ToastContext.jsx';
import { loadNotificationReads, markNotificationsRead, notificationReadKey, notificationToken } from '../../lib/notificationReads.js';

export default function Notifications({ user }) {
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const readKey = notificationReadKey(user);
  const [read, setRead] = useState(() => loadNotificationReads(readKey));
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
    apiPost(isAdmin ? '/api/admin' : '/api/notifications', isAdmin ? { action: 'notifications' } : {}).then(result => {
      if (!disposed) {
        setData(isAdmin ? { ...result, notifications: result.notifications.map(item => ({ ...item, title: item.name, description: `${item.role === 'teacher' ? 'Teacher' : 'Student'} registration · Review account`, href: `/admin/registrations?registration=${encodeURIComponent(item.id)}` })) } : result);
        setError('');
      }
    }).catch(err => {
      if (!disposed) setError(err.message);
    }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [refresh, isAdmin]);

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

  useEffect(() => {
    const syncRead = event => { if (event.key === readKey || event.key == null) setRead(loadNotificationReads(readKey)); };
    window.addEventListener('storage', syncRead);
    return () => window.removeEventListener('storage', syncRead);
  }, [readKey]);

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

  const unread = data.notifications.filter(item => !read.has(notificationToken(item))).length;
  const badgeCount = isAdmin ? data.total : unread;
  const markRead = items => { if (!isAdmin) setRead(previous => markNotificationsRead(previous, items, readKey)); };
  const openNotification = item => {
    markRead([item]); setOpen(false);
    if (!isAdmin) hydrateRecords({ force: true }).catch(() => toast.error('Could not refresh academic records. Please try again.'));
  };
  const footer = isAdmin ? ['/admin/registrations', 'View all registrations'] : user.role === 'teacher' ? ['/teacher/class-record', 'Open class records'] : ['/student/academic-records', 'View academic records'];
  return <div className="relative" ref={container}>
    <button ref={button} type="button" aria-label={`Notifications${badgeCount ? `, ${badgeCount} ${isAdmin ? 'pending registrations' : 'unread'}` : ''}`}
      aria-expanded={open} aria-controls="portal-notifications"
      onClick={() => { if (!open) setRefresh(value => value + 1); setOpen(value => !value); }}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
      <Bell className="h-[18px] w-[18px]"/>
      {badgeCount > 0 && <span aria-hidden="true" className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{badgeCount > 99 ? '99+' : badgeCount}</span>}
    </button>
    {open && <section id="portal-notifications" aria-label="Notifications" className="absolute -right-12 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:right-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
        <button type="button" aria-label="Refresh notifications" disabled={loading} onClick={() => setRefresh(value => value + 1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button>
      </div>
      {error ? <p role="alert" className="px-4 py-4 text-sm text-rose-700">Could not refresh notifications. {error} Use Refresh to retry.</p>
        : loading && !data.notifications.length ? <p role="status" className="px-4 py-5 text-sm text-slate-500">Loading notifications…</p>
        : !data.total ? <p role="status" className="px-4 py-5 text-sm text-slate-500">{isAdmin ? 'You’re all caught up. No registrations are awaiting approval.' : 'You’re all caught up. No notifications right now.'}</p>
        : <>
          <div className="flex items-center justify-between gap-2 px-4 py-2"><p className="text-xs font-medium text-slate-500">{isAdmin ? `${data.total} registration${data.total === 1 ? '' : 's'} awaiting approval` : `${unread} unread notification${unread === 1 ? '' : 's'}`}</p>{!isAdmin && unread > 0 && <button type="button" className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => markRead(data.notifications)}>Mark all read</button>}</div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">{data.notifications.map(item => <li key={item.id}>
            <Link to={item.href} onClick={() => openNotification(item)} className={`block px-4 py-3 hover:bg-brand-50 focus-visible:bg-brand-50 ${!isAdmin && !read.has(notificationToken(item)) ? 'bg-brand-50/50' : ''}`}>
              <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
              <span className="block text-xs text-slate-600">{item.description}</span>
            </Link>
          </li>)}</ul>
        </>}
      <Link to={footer[0]} onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50">{footer[1]}</Link>
    </section>}
  </div>;
}
