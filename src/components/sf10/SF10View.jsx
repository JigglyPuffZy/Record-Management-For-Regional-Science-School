import { Lock, Pencil } from 'lucide-react';
import { formatDate } from '../../lib/utils.js';
import GradeTable from './GradeTable.jsx';
import AcademicHistory from './AcademicHistory.jsx';
import AppLogo from '../ui/AppLogo.jsx';

export default function SF10View({ sf10, studentId, teacherId, schoolYear, editableSubjectIds, onSaved }) {
  if (!sf10) return null;
  const { learner, eligibility, currentYear, history } = sf10;
  const editable = Boolean(teacherId);

  return (
    <div className="print-area">
      <div className="print-page rounded-2xl border border-slate-200 bg-[#fbfaf6] p-6 font-serif text-slate-900 shadow-md sm:p-8">
        {editable ? (
          <div className="no-print mb-4 flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800">
            <Pencil className="h-4 w-4" />
            EDITABLE &mdash; current-year term grades for your assigned subjects can be entered directly below
          </div>
        ) : (
          <div className="no-print mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
            <Lock className="h-4 w-4" />
            VIEW ONLY &mdash; changes are managed by authorized teachers
          </div>
        )}

        <header className="mb-6 border-b-2 border-slate-800 pb-4 text-center">
          <AppLogo className="mx-auto mb-3 h-20 w-20" />
          <p className="text-xs uppercase tracking-widest text-slate-500">Republic of the Philippines &middot; Department of Education</p>
          <h1 className="mt-1 text-lg font-bold uppercase tracking-wide">{learner.school}</h1>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Learner&rsquo;s Permanent Academic Record (SF10)
          </p>
        </header>

        <section className="mb-6 print-avoid-break">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Learner&rsquo;s Information</h4>
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <Field label="Last Name" value={learner.lastName} />
            <Field label="First Name" value={learner.firstName} />
            <Field label="Middle Name" value={learner.middleName || '—'} />
            <Field label="Name Extension" value={learner.nameExtension || '—'} />
            <Field label="LRN" value={learner.lrn} />
            <Field label="Birthdate" value={formatDate(learner.birthdate)} />
            <Field label="Sex" value={learner.sex} />
            <Field label="Status" value={learner.status} />
          </div>
        </section>

        {eligibility ? (
          <section className="mb-6 rounded-lg border border-dashed border-slate-300 p-4 print-avoid-break">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Eligibility for JHS Enrollment</h4>
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              <Field label="Basis of Admission" value={eligibility.basis || 'Not recorded'} />
              <Field label="Elementary School" value={eligibility.elementarySchool} />
              <Field label="School ID" value={eligibility.schoolId} />
              <Field label="School Address" value={eligibility.schoolAddress} />
              <Field label="General Average" value={eligibility.generalAverage} />
              <Field label="School Year Graduated" value={eligibility.graduationYear} />
              <Field label="PEPT / ALS Rating" value={eligibility.assessmentRating} />
              <Field label="Date of Examination" value={formatDate(eligibility.assessmentDate)} />
              <Field label="Assessment Center" value={eligibility.assessmentCenter} />
              <Field label="Other Credential" value={eligibility.otherCredential} />
              <Field label="School Year Enrolled (Grade 7)" value={eligibility.schoolYearEnrolled} />
              <Field label="Eligible for Enrollment" value={eligibility.eligible === true ? 'Yes' : eligibility.eligible === false ? 'No' : 'Not verified'} />
            </div>
          </section>
        ) : null}

        <section className="mb-8 print-avoid-break">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-1">
            <h4 className="text-sm font-bold uppercase tracking-wide">
              {currentYear.gradeLevel} &middot; School Year {currentYear.schoolYear} ({currentYear.isCurrent ? 'Current' : 'Latest enrollment'})
            </h4>
            <p className="text-xs text-slate-500">Adviser: {currentYear.adviser}</p>
          </div>
          <p className="mb-2 text-[11px] leading-snug text-slate-500">
            {currentYear.school} &middot; School ID {currentYear.schoolId} &middot; Section {currentYear.section} &middot;{' '}
            {currentYear.district} &middot; {currentYear.division} &middot; {currentYear.region}
          </p>
          <GradeTable
            gradeLevel={currentYear.gradeLevel}
            subjects={currentYear.subjects}
            periods={currentYear.gradingPeriods}
            finalLabel={currentYear.finalLabel}
            generalAverage={currentYear.generalAverage}
            scale={currentYear.scale}
            teacherId={teacherId}
            studentId={studentId}
            schoolYear={schoolYear ?? currentYear.schoolYear}
            editableSubjectIds={editableSubjectIds}
            onSaved={onSaved}
          />
        </section>

        <section>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">Scholastic Record &mdash; Prior School Years</h4>
          <AcademicHistory history={history} />
        </section>

        <footer className="mt-10 hidden grid-cols-2 gap-8 text-sm print:grid">
          <div>
            <div className="mb-1 h-10 border-b border-slate-800" />
            <p className="text-xs text-slate-600">Class Adviser</p>
          </div>
          <div>
            <div className="mb-1 h-10 border-b border-slate-800" />
            <p className="text-xs text-slate-600">School Principal</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-dotted border-slate-300 pb-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}:</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}
