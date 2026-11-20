export async function apiPost(path, body = {}) {
  const response = await fetch(path, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Unable to reach the server. Please try again.');
    error.status = response.status;
    throw error;
  }
  return result;
}
export const dashboardFor = role => `/${['admin', 'teacher', 'student'].includes(role) ? role : 'student'}/dashboard`;
