# Record-Management-For-Regional-Science-School

SF10 & Class Record Management System for a Philippine regional science high school.

A React + Vite frontend for managing student SF10 (Learner's Permanent Academic
Record) and Class Records for a Philippine high school, with separate
Student and Teacher portals.

## Stack

- React 18 + Vite 6
- React Router 6
- Tailwind CSS 4
- lucide-react icons

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173.

### Demo credentials

| Role    | ID / Email | Password    |
| ------- | ---------- | ----------- |
| Student | 136045210001 (LRN) | student123  |
| Teacher | T-2001     | teacher123  |

All student and teacher accounts in `src/data/students.js` and
`src/data/teachers.js` share the same demo password pattern.

## Architecture

- `src/data/` — static mock data (school info, subjects, classes, teaching
  assignments, students, teachers, and generated seed grades). This is the
  "database" today.
- `src/services/academicRecords.js` — the single business-logic layer every
  page reads and writes through. Current-school-year grades live in an
  in-memory array mirrored to `localStorage`, so the Class Record acts as
  the source of truth: a teacher's save immediately shows up on the
  student's Dashboard, SF10, and Academic Records via the same getters.
  Swapping this file's internals for real Supabase/Postgres calls should
  not require touching any page or component.
- `src/context/` — `AuthContext` (session + role-based login) and
  `ToastContext` (notifications).
- `src/routes/ProtectedRoute.jsx` — redirects unauthenticated users to
  `/login` and cross-role access attempts (e.g. a student opening
  `/teacher/dashboard`) back to their own dashboard.
- `src/components/` — layout (`Sidebar`, `Header`, `AppLayout`), generic UI
  primitives (`Button`, `Card`, `Modal`, `Table`, etc.), and feature
  components for the SF10 view and the Class Record grade editor.
- `src/pages/` — route-level screens, split into `auth/`, `student/`, and
  `teacher/`.

## Notes on the mock data layer

- Only the active school year (`2026-2027`) is editable. Grade 10 uses three
  terms (Term 1–3) with the MATATAG descriptor scale; Grades 7–9 keep the
  four-quarter JHS structure. Prior years are
  stored as locked/archival records in `src/data/academicHistory.js` and are
  never written to at runtime, matching how a closed grading period would
  behave with a real backend.
- Passwords are stored in plaintext in the mock data files for demo
  purposes only — this is not how authentication should work in
  production.
- Teacher > Settings has a "Reset Demo Data" action that clears any local
  edits and restores the original seed grades.
