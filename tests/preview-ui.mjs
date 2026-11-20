// Local visual QA only. Synthetic accounts; no database or production API calls.
// Build first, then: node tests/preview-ui.mjs (http://127.0.0.1:4174)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const admin = { id: 'admin-preview', accountId: 'admin-preview', role: 'admin', name: 'School Administrator', email: 'admin@example.test' };
const classes = [{ id: 'G10-RIZAL', grade_level: 'Grade 10', section: 'Rizal', school_year_id: '2026-2027' }];
const data = { classes, subjects: [{ id: 'MATH', name: 'Mathematics' }, { id: 'SCI', name: 'Science' }, { id: 'ENG', name: 'English' }], assignments: [], accounts: [
  { id: 'teacher-preview', role: 'teacher', identifier: 't-preview', name: 'Sample Teacher', email: 'teacher@example.test', status: 'pending', details: { classId: 'G10-RIZAL', position: 'Teacher I', verification: 'Local preview example: Science department. Personnel office can verify employment.' }, created_at: '2026-11-20T02:00:00Z' },
  { id: 'student-preview', role: 'student', identifier: '123456789012', name: 'Sample Learner', email: 'learner@example.test', status: 'pending', details: { classId: 'G10-RIZAL', verification: 'Local preview example: Enrolled in Grade 10 Rizal. Registrar can confirm enrollment.' }, created_at: '2026-11-20T03:00:00Z' },
] };
createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw || '{}');
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/api/access') return res.end(JSON.stringify(body.action === 'options' ? { classes } : { user: admin }));
      if (req.url === '/api/admin') {
        if (body.action === 'review') { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Visual preview only. No registrations are changed.' })); }
        return res.end(JSON.stringify(data));
      }
      res.statusCode = 404; return res.end('{}');
    }
    let file = resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root + sep) && file !== root) { res.statusCode = 403; return res.end(); }
    if (!extname(file)) file = resolve(root, 'index.html');
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(4174, '127.0.0.1', () => console.log('Synthetic UI preview: http://127.0.0.1:4174/admin/dashboard'));
