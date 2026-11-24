// Local visual QA only. Synthetic accounts; no database or production API calls.
// Build first, then: node tests/preview-ui.mjs (http://127.0.0.1:4174)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const port = Number(process.argv.find(value => value.startsWith('--port='))?.split('=')[1] || 4174);
const admin = { id: 'admin-preview', accountId: 'admin-preview', role: 'admin', name: 'School Administrator', email: 'admin@example.test' };
const teacher = { id: 'T-PREVIEW', accountId: 'teacher-preview', role: 'teacher', name: 'Sample Teacher', email: 'teacher@example.test' };
const actor = process.argv.includes('--teacher') ? teacher : admin;
const classes = [{ id: 'G10-ARCHIMEDES', grade_level: 'Grade 10', section: 'Archimedes', school_year_id: '2026-2027' }];
const data = { classes, subjects: [{ id: 'MATH', name: 'Mathematics' }, { id: 'SCI', name: 'Science' }, { id: 'ENG', name: 'English' }], assignments: [], accounts: [
  { id: 'teacher-preview', role: 'teacher', identifier: 't-preview', name: 'Sample Teacher', email: 'teacher@example.test', status: 'pending', details: { classId: 'G10-ARCHIMEDES', position: 'Teacher I', verification: 'Local preview example: Science department. Personnel office can verify employment.' }, created_at: '2026-11-20T02:00:00Z' },
  { id: 'student-preview', role: 'student', identifier: '123456789012', name: 'Sample Learner', email: 'learner@example.test', status: 'pending', details: { classId: 'G10-ARCHIMEDES', verification: 'Local preview example: Enrolled in 10 - Archimedes. Registrar can confirm enrollment.' }, created_at: '2026-11-20T03:00:00Z' },
] };
const learners = [1, 2].map(n => ({ student_id: `S-PREVIEW-${n}`, lrn: `12345678901${n}`, first_name: `Learner ${n}`, last_name: 'Sample', middle_name: '', name_extension: '', display_name: `Sample Learner ${n}`, birthdate: '2011-02-03', sex: 'Female', class_id: 'G10-ARCHIMEDES', status: 'Active' }));
const grades = learners.map(student => ({ student_id: student.student_id, class_id: 'G10-ARCHIMEDES', subject_id: 'MATH', school_year_id: '2026-2027', grade_level: 'Grade 10', quarter1: null, quarter2: null, quarter3: null, quarter4: null, final_grade: null }));
createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw || '{}');
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/api/access') return res.end(JSON.stringify(['options', 'teacher-options'].includes(body.action) ? { classes } : { user: actor }));
      if (req.url === '/api/records') return res.end(JSON.stringify({ students: learners, grades, classes: classes.map(cls => ({ ...cls, adviser_teacher_id: teacher.id })), teachers: [{ teacher_id: teacher.id, name: teacher.name, email: teacher.email, position: 'Teacher I' }], assignments: [{ teacher_id: teacher.id, class_id: 'G10-ARCHIMEDES', subject_id: 'MATH' }] }));
      if (req.url === '/api/save-grade') {
        // Save only to this process's synthetic fixture; never to Supabase.
        const grade = grades.find(row => row.student_id === body.studentId);
        if (!grade) { res.statusCode = 404; return res.end('{}'); }
        grade[body.field] = body.value;
        return res.end(JSON.stringify({ studentId: grade.student_id, classId: grade.class_id, subjectId: grade.subject_id, schoolYear: grade.school_year_id, gradeLevel: grade.grade_level, quarter1: grade.quarter1, quarter2: grade.quarter2, quarter3: grade.quarter3, quarter4: null, finalGrade: grade.final_grade }));
      }
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
}).listen(port, '127.0.0.1', () => console.log(`Synthetic UI preview: http://127.0.0.1:${port}/${actor.role}/dashboard`));
