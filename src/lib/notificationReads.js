export const notificationReadKey = user => `sf10_notification_reads:${user.role}:${user.accountId || user.id}`;
export const notificationToken = item => `${item.id}|${item.version || item.createdAt || ''}`;
export function loadNotificationReads(key, storage) {
  try {
    storage ??= globalThis.localStorage;
    const values = JSON.parse(storage.getItem(key) || '[]');
    return new Set(Array.isArray(values) ? values.filter(value => typeof value === 'string').slice(-200) : []);
  } catch { return new Set(); }
}
export function markNotificationsRead(previous, items, key, storage) {
  const next = new Set([...previous, ...items.map(notificationToken)].slice(-200));
  try { (storage || globalThis.localStorage).setItem(key, JSON.stringify([...next])); } catch { /* Keep in-memory read state when browser storage is unavailable. */ }
  return next;
}
