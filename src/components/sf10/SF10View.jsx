import { Lock } from 'lucide-react';
import { formatDate, formatGrade, getRemarks } from '../../lib/utils.js';
import { getDescriptorForGradeLevel } from '../../lib/grading.js';
import AcademicHistory from './AcademicHistory.jsx';

function DescriptorCell({ gradeLevel, finalGrade }) {
  const { descriptor, filipinoDescriptor, remarks } = getDescriptorForGradeLevel(gradeLevel, finalGrade);
  if (!descriptor) return <span className="text-slate-400">—</span>;
  if (filipinoDescriptor) {
    return (
      <span>
        {descriptor}
        <br />
        <span className="text-xs text-slate-500">({filipinoDescriptor})</span>
      </span>
    );
  }
  return <span>{descriptor}</span>;
}

function GradeTable({ gradeLevel, subjects, periods, finalLabel, generalAverage, scale }) {
  const showRemarks = scale !== 'grade10';

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-300">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-2.5">Learning Area</th>
            {periods.map((p) => (
              <th key={p.id} className="px-3 py-2.5 text-right">{p.label}</th>
            ))}
            <th className="px-3 py-2.5 text-right">{finalLabel}</th>
            <th className="px-4 py-2.5">Descriptor</th>
            {showRemarks ? <th className="px-4 py-2.5">Remarks</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {subjects.map((s) => (
            <tr key={s.subjectId}>
              <td className="px-4 py-2 font-medium">{s.subjectName}</td>
              {periods.map((p) => (
                <td key={p.id} className="px-3 py-2 text-right tabular-nums">{formatGrade(s[p.field])}</td>
              ))}
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatGrade(s.finalGrade)}</td>
              <td className="px-4 py-2 text-slate-600">
                <DescriptorCell gradeLevel={gradeLevel} finalGrade={s.finalGrade} />
              </td>
              {showRemarks ? (
                <td className="px-4 py-2 text-slate-600">{getRemarks(s.finalGrade)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
            <td className="px-4 py-2.5" colSpan={periods.length}>
              General Average
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums">{formatGrade(generalAverage)}</td>
            <td className="px-4 py-2.5" colSpan={showRemarks ? 2 : 1}>
              {scale === 'grade10' ? (
                <DescriptorCell gradeLevel={gradeLevel} finalGrade={generalAverage} />
              ) : (
                getRemarks(generalAverage)
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function SF10View({ sf10 }) {
  if (!sf10) return null;
  const { learner, eligibility, currentYear, history } = sf10;

  return (
    <div className="print-area">
      <div className="print-page rounded-2xl border border-brand-500/15 bg-[#fbfaf6] p-6 font-serif text-slate-900 shadow-2xl shadow-brand-500/10 ring-1 ring-white/5 sm:p-8">
        <div className="no-print mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
          <Lock className="h-4 w-4" />
          VIEW ONLY &mdash; this record cannot be edited from this portal
        </div>

        <header className="mb-6 border-b-2 border-slate-800 pb-4 text-center">
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
              <Field label="Basis of Admission" value={eligibility.basis} />
              <Field label="School Year Enrolled (Grade 7)" value={eligibility.schoolYearEnrolled} />
              <Field label="Eligible for Enrollment" value={eligibility.eligible ? 'Yes' : 'No'} />
            </div>
          </section>
        ) : null}

        <section className="mb-8 print-avoid-break">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-1">
            <h4 className="text-sm font-bold uppercase tracking-wide">
              {currentYear.gradeLevel} &middot; School Year {currentYear.schoolYear} (Current)
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
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
