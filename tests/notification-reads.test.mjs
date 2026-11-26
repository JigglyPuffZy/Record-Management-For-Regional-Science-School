import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationReadKey, notificationToken, loadNotificationReads, markNotificationsRead } from '../src/lib/notificationReads.js';

test('read notifications persist per account and updated records become unread again', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const firstKey = notificationReadKey({ role: 'student', accountId: 'one' });
  const secondKey = notificationReadKey({ role: 'student', accountId: 'two' });
  const item = { id: 'grade:1', version: 'first' };
  const read = markNotificationsRead(new Set(), [item], firstKey, storage);
  assert.ok(read.has(notificationToken(item)));
  assert.ok(loadNotificationReads(firstKey, storage).has(notificationToken(item)));
  assert.equal(loadNotificationReads(secondKey, storage).size, 0);
  assert.equal(read.has(notificationToken({ ...item, version: 'updated' })), false);
  assert.notEqual(firstKey, notificationReadKey({ role: 'teacher', accountId: 'one' }));
});

test('malformed or unavailable storage does not break notifications, and read history is bounded', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(loadNotificationReads('one', broken).size, 0);
  assert.equal(loadNotificationReads('one', { getItem: () => '{bad json' }).size, 0);
  assert.equal(loadNotificationReads('one', { getItem: () => '{}' }).size, 0);
  const items = Array.from({ length: 250 }, (_, index) => ({ id: String(index), version: 'one' }));
  const read = markNotificationsRead(new Set(), items, 'one', broken);
  assert.equal(read.size, 200); assert.ok(read.has('249|one')); assert.equal(read.has('0|one'), false);
});
