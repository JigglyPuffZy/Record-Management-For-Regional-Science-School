import { Lock, Pencil } from 'lucide-react';
import SF10Details from './SF10Details.jsx';
import GradeTable from './GradeTable.jsx';
import AcademicHistory from './AcademicHistory.jsx';
import AppLogo from '../ui/AppLogo.jsx';
import JHSRecordHeader from './JHSRecordHeader.jsx';
import { isJHSQuarterlyGrade } from '../../lib/sf10Template.js';

export default function SF10View({ sf10, studentId, teacherId, schoolYear, editableSubjectIds, onSaved }) {
  if (!sf10) return null;
  const { learner, currentYear, history } = sf10;
  const editable = Boolean(teacherId);

  return (
    <div className="print-area">
      <div className="print-page rounded-2xl border border-slate-200 bg-[#fbfaf6] p-6 font-serif text-slate-900 shadow-md sm:p-8">
        {editable ? (
          <div className="no-print mb-4 flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800">
            <Pencil className="h-4 w-4" />
            EDITABLE &mdash; learner details, eligibility, and your assigned subject grades can be entered directly below
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

        <SF10Details key={studentId || learner.lrn} sf10={sf10} studentId={studentId} teacherId={teacherId} onSaved={onSaved}/>

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
          {isJHSQuarterlyGrade(currentYear.gradeLevel) && <JHSRecordHeader year={currentYear}/>}
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
          <AcademicHistory history={history} sf10={sf10} studentId={studentId} teacherId={teacherId} classId={currentYear.classId} onSaved={onSaved}/>
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
