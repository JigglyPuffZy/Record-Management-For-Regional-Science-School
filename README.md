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

## Database connection

Database provisioning is managed separately in Supabase. Connect this application to an existing school database; setup SQL and migration commands are not included in this repository.

The connected project must provide:

- `app_accounts` for account roles, hashed passwords, pending/approved/rejected status, and review history.
- School, school-year, subject, curriculum, class, teacher, student, teaching-assignment, and grade-record tables.
- A server-only `review_registration` function that approves or rejects pending registrations and creates the corresponding teacher/student records in one transaction.
- Grade-record triggers that compute final ratings for three Grade 10 terms or four terms for Grades 7–9.
- Restricted database permissions: account and academic records are accessed through the server APIs.
- `student_eligibility`, `academic_record_audit`, and the server-only `sf10_workflow(uuid,text,jsonb)` function for saved eligibility, prior records/corrections, class setup, teaching assignments, and enrollment progression. Install the separately supplied SF10 workflow migration before using these controls; SQL remains outside this repository.

Run `npm run db:check` to check the configured connection and table permissions. The URL and service-role key must belong to the same project. Account provisioning and password changes are handled by the database administrator.

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
- `src/services/academicRecords.js`: shared authorized cache consumed by dashboards, class records, and SF10. Grades persist through the API; detailed assessment score drafts remain in browser localStorage.
- Grade 10 uses three grading periods; Grades 7–9 use four. The existing grading weights and transmutation table are retained.

## SF10 and school-year workflows

Learner information and eligibility are editable directly on the SF10 form in the teacher portal. **Save learner details** commits both sections atomically through the server-only `save_sf10_details(uuid,jsonb)` function (install the separately supplied SF10 details SQL update). LRN corrections update the linked student's login identifier without changing the stable student ID or grade links. A verification reason is recorded. Background refresh preserves unsaved input; concurrent corrections require reloading saved details. Enrollment status stays under Admin → Academics. Student and printed views show saved values.

Teachers can enter current-year term grades directly in **Teacher → SF10**, limited to their assigned subjects. Eligibility details are saved per learner. **Add prior record** copies verified Grade 7–9 grades from existing records; **Correct prior grades** recalculates the rating and remarks and requires a recorded reason. Student views remain read-only. Open portals refresh saved records every 15 seconds and when the window regains focus; a failed refresh displays a retry notice without discarding the current view.

In **Admin → Academics**, prepare a year and its sections, assign approved teachers (including Research), then confirm promotion, retention, or Grade 10 graduation for selected learners. The server requires complete grades and preserves the old year before changing enrollment in one transaction. Promotion follows Grade 7 → 8 → 9 → 10. Staff verify the outcome; the app does not decide a learner’s eligibility for promotion. Activate the next year after all active learners have their enrollment decisions recorded. Graduated learners keep their records.

Administrators can delete teacher/student login accounts through a confirmation dialog. Academic profiles and grades are retained; administrator accounts cannot be deleted from this screen. School ID is **300610**, division **SDO Isabela**. Unconfirmed district and address fields are blank.

Grades 7–9 have 14 Written Works and 14 Performance Tasks slots; Grade 10 keeps 10 each. All have three examination slots. Existing score drafts and total points are preserved when the new columns are added.

The subject catalog includes Filipino, English, Mathematics, Science, Araling Panlipunan (AP), Values Education, TLE, and MAPEH, alongside Research and existing legacy subjects. Assign the subject to an approved teacher/class before entering its grades. Values Education has its own ID, preserving earlier ESP records.

## Assessment total points

In **Teacher → Grades**, enter each assessment's maximum in the **Total points** row, then enter learner scores displayed as `score / total`. Maxima apply to the whole class for that subject and period. Each category percentage is `(sum of entered scores / sum of their corresponding maxima) × 100`; the subject's existing weights produce the initial grade, followed by the existing transmutation table. Save posts the transmuted term grade to SF10. For example, WW `8/10`, PT `45/50`, and EX `30/40` with 20%/50%/30% weights yield `83.5` initial and `86` transmuted.

Blank scores are ungraded and excluded from the denominator; an explicit `0` counts toward the maximum. Scores above their maximum, negative scores, and nonpositive/missing maxima prevent posting. Assessment maxima and score drafts remain in browser localStorage, scoped by class, subject, school year, and period. Existing percentage-based draft columns start at `/100` to preserve their prior calculation until the teacher changes their maxima. No database migration is needed for total-points entry.

```sh
npm test
npm run build
```

The tests cover authentication and authorization, registration validation, grade permissions, assessment calculations, and draft storage. HTTP handlers use an in-memory database adapter. The tests do not connect to the live database or validate its schema and stored procedures.

For visual QA with synthetic accounts only, run `node tests/preview-ui.mjs` after a build and open http://127.0.0.1:4174/admin/dashboard. This isolated preview cannot approve accounts and never connects to Supabase.

## Maintained project files

- `src/`: the application routes, UI, grading calculations, and authorized records cache. Data comes from the server APIs.
- `api/`: server authentication, registration review, records access, and grade writes.
- `scripts/`: local API middleware, the database connection check, and the school-logo processing utility.
- `tests/`: authentication and grading tests, plus the isolated visual preview. Use `--teacher` to preview teacher screens and `--port=4176` to select a different preview port.
- `public/`: the transparent school logo, favicon, and 4K branding export.

Local environment files and deployment configuration stay outside version control. Build output (`dist/`) is generated with `npm run build`.
