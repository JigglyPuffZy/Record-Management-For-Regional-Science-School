# Record Management — Regional Science High School for Region II

SF10 and Class Record Management with separate Admin, Teacher, and Student portals.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:5173. The Vite development plugin serves the same API handlers used by Vercel.

Set server environment variables in `.env` (never commit this file):

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
APP_SESSION_SECRET=your-long-random-server-only-secret
```

`APP_SESSION_SECRET` is recommended; the service-role key is used for signing when it is absent. Neither server secret may use a `VITE_` prefix. Production requires these variables on Vercel, HTTPS, and same-origin API requests.

## Database upgrade

For the existing database, run **only** `supabase/account_approvals.sql` in the Supabase SQL Editor before deploying this version. It creates private account records, migrates existing users, and closes the old anonymous database/login/write paths. It preserves existing students, teachers, grades, and class records. Do not rerun `full_schema.sql` or `cleanup_single_teacher.sql` against an existing school: those scripts reset data.

On a brand-new database, initialize the existing schema and school reference data first, then apply `account_approvals.sql`. The historical SQL generator is a legacy bootstrap utility; application classes and teachers now load from the server rather than static seed arrays.

`npm run db:approvals` can apply the migration only if the project already exposes a service-role-only `exec_sql` RPC. Otherwise use the SQL Editor. Apply the migration before publishing the matching application code, and sign in again after deployment.

The existing `T-ADMIN` account becomes **Admin** and keeps its current credentials. It must use the Admin sign-in tab. Existing teacher/student accounts are retained as approved accounts. Legacy passwords are converted to salted scrypt hashes and removed from profile tables on the first successful sign-in. New passwords are hashed immediately. Public registration cannot create administrator accounts.

## Account approval workflow

1. A teacher or student selects **Register for approval**, supplies their school ID/LRN, contact email, identity details, requested class, and verification information.
2. The account stays **pending**. It cannot sign in and does not yet create a teacher profile, enrolled learner, or grade records.
   Approved teachers can also use **Students → Create Student Account** to submit a learner's registration for one of their assigned sections. These accounts also stay pending until admin approval. The review screen records the submitting teacher; teachers cannot approve the accounts they create.
3. The administrator checks the person's identity against personnel/enrollment records through the **Registrations** screen. Approval requires a verification note. Teachers are assigned a class and subjects; students receive a confirmed enrollment section.
4. Approval creates the corresponding school records in one database transaction. Rejection records the reason and keeps access blocked. The administrator can inspect decisions and approved accounts later. No notification email is sent automatically.
5. Approved users sign in through their respective portal. Teachers view only assigned classes/learners and can save grades only for assigned subjects. Students see only their own records.

## Architecture and checks

- React 18, Vite 6, React Router 6, Tailwind CSS 4, Supabase PostgreSQL, and lucide-react.
- `api/access.js`: public registration, sign-in/out, and server session validation.
- `api/admin.js`: administrator-only registration review and account directory.
- `api/records.js`: authorized records and dynamic teacher/class metadata.
- `api/save-grade.js`: teacher-only saves with assignment, roster, active-year, and grading-period checks. The server sets the editor identity.
- `api/_lib/access.js`: hashed passwords, signed eight-hour HttpOnly/SameSite cookies, and server authorization. Browser role flags are ignored.
- `supabase/account_approvals.sql`: private account table, migration, and transactional approval with review history. The class row is locked during approval to prevent conflicting teacher assignments.
- `src/services/academicRecords.js`: shared authorized cache consumed by dashboards, class records, and SF10. Grades persist through the API; detailed assessment score drafts remain in browser localStorage.
- Grade 10 uses three grading periods; Grades 7–9 use four. The existing grading weights and transmutation table are retained.

```sh
npm test
npm run build
```

The automated tests use an in-memory database adapter to cover handler authorization, approval gating, registration validation, legacy password upgrade, and record privacy without touching the live database. They do not execute PostgreSQL migration functions. Verify the migration and approve/reject flow on the connected database after authorized setup.

For visual QA with synthetic accounts only, run `node tests/preview-ui.mjs` after a build and open http://127.0.0.1:4174/admin/dashboard. This isolated preview cannot approve accounts and never connects to Supabase.
