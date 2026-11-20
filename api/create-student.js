import access from './access.js';

// Teachers can submit learner registrations; administrator approval is still required.
export default async function handler(req, res) {
  return access({ ...req, method: req.method, headers: req.headers, body: { ...req.body, action: 'teacher-register-student', role: 'student' } }, res);
}
