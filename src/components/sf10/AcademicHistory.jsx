import { formatGrade, formatDate, getRemarks, getGradeDescriptor } from '../../lib/utils.js';
import EmptyState from '../ui/EmptyState.jsx';
import { History } from 'lucide-react';

export default function AcademicHistory({ history }) {
  if (!history || history.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No prior academic records"
        description="This learner has no completed school years on file yet. Records will appear here once a school year is closed."
      />
    );
  }

  return (
    <div className="space-y-6">
      {history.map((year) => (
        <div key={year.schoolYear} className="print-avoid-break">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-1">
            <h4 className="text-sm font-bold text-slate-900">
              {year.gradeLevel} &middot; School Year {year.schoolYear}
            </h4>
            <p className="text-xs text-slate-500">Adviser: {year.adviser}</p>
          </div>
          <p className="mb-2 text-[11px] leading-snug text-slate-500">
            {year.school} &middot; School ID {year.schoolId} &middot; Section {year.section} &middot; {year.district} &middot;{' '}
            {year.division} &middot; {year.region}
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-300">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Learning Area</th>
                  <th className="px-3 py-2.5 text-right">Term 1</th>
                  <th className="px-3 py-2.5 text-right">Term 2</th>
                  <th className="px-3 py-2.5 text-right">Term 3</th>
                  <th className="px-3 py-2.5 text-right">Term 4</th>
                  <th className="px-3 py-2.5 text-right">Final Rating</th>
                  <th className="px-4 py-2.5">Descriptor</th>
                  <th className="px-4 py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {year.subjects.map((s) => (
                  <tr key={s.subjectId}>
                    <td className="px-4 py-2 font-medium text-slate-800">{s.subjectName}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatGrade(s.quarter1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatGrade(s.quarter2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatGrade(s.quarter3)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatGrade(s.quarter4)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{formatGrade(s.finalGrade)}</td>
                    <td className="px-4 py-2 text-slate-600">{getGradeDescriptor(s.finalGrade)}</td>
                    <td className="px-4 py-2 text-slate-600">{getRemarks(s.finalGrade)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {year.remedialClasses && year.remedialClasses.length > 0 ? (
            <div className="mt-3 print-avoid-break">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">Remedial Classes</p>
              <div className="overflow-x-auto rounded-lg border border-amber-300/60">
                <table className="w-full min-w-max text-left text-sm">
                  <thead className="bg-amber-50 text-xs font-semibold uppercase tracking-wide text-amber-800">
                    <tr>
                      <th className="px-4 py-2">Learning Area</th>
                      <th className="px-3 py-2 text-right">Final Rating</th>
                      <th className="px-3 py-2 text-right">Remedial Mark</th>
                      <th className="px-3 py-2 text-right">Recomputed Final Grade</th>
                      <th className="px-4 py-2">Remarks</th>
                      <th className="px-4 py-2">Conducted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 bg-white">
                    {year.remedialClasses.map((r) => (
                      <tr key={r.subjectId}>
                        <td className="px-4 py-2 font-medium text-slate-800">{r.learningArea}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatGrade(r.finalRating)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatGrade(r.remedialClassMark)}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
                          {formatGrade(r.recomputedFinalGrade)}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{getRemarks(r.recomputedFinalGrade)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                          {formatDate(r.conductedFrom)} &ndash; {formatDate(r.conductedTo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
