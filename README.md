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

Run **only** `supabase/account_approvals.sql` in the Supabase SQL Editor. It is a standalone setup/upgrade that creates missing base tables, enum types, grading triggers, school-year/subject reference records, and private registration accounts before adding approval functions. It preserves existing students, teachers, passwords, grades, and class records. Do not rerun `full_schema.sql` or `cleanup_single_teacher.sql` as a repair: those legacy scripts reset data.

If no administrator exists, setup creates `T-ADMIN` with a random temporary password and returns it in the final SQL Results (`admin_id`, `email`, `temporary_password`). Save that result securely and use the **Admin** sign-in tab. Empty results mean no administrator credentials were created or changed. Existing credentials remain valid. A new school starts with Grade 10 Rizal and school contact/ID fields marked unconfigured; update those reference details with the school's actual information. If a teachers table exists in another schema, the script stops instead of creating parallel records.

Confirm you are using the same Supabase project as the app's environment URL. The historical SQL generator and cleanup script are legacy tools and are not required by this setup.

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

## Assessment total points

In **Teacher → Grades**, enter each assessment's maximum in the **Total points** row, then enter learner scores displayed as `score / total`. Maxima apply to the whole class for that subject and period. Each category percentage is `(sum of entered scores / sum of their corresponding maxima) × 100`; the subject's existing weights produce the initial grade, followed by the existing transmutation table. Save posts the transmuted term grade to SF10. For example, WW `8/10`, PT `45/50`, and EX `30/40` with 20%/50%/30% weights yield `83.5` initial and `86` transmuted.

Blank scores are ungraded and excluded from the denominator; an explicit `0` counts toward the maximum. Scores above their maximum, negative scores, and nonpositive/missing maxima prevent posting. Assessment maxima and score drafts remain in browser localStorage, scoped by class, subject, school year, and period. Existing percentage-based draft columns start at `/100` to preserve their prior calculation until the teacher changes their maxima. No database migration is needed for total-points entry.

```sh
npm test
npm run build
```

HTTP handler tests use an in-memory adapter. SQL setup tests execute the actual migration and approval function in an isolated PGlite PostgreSQL instance, with Supabase roles/auth schema stubbed locally. They verify fresh setup, approval/rejection, grade recomputation, permission restrictions, preservation on rerun, and wrong-schema detection. No tests touch the live database.

For visual QA with synthetic accounts only, run `node tests/preview-ui.mjs` after a build and open http://127.0.0.1:4174/admin/dashboard. This isolated preview cannot approve accounts and never connects to Supabase.
