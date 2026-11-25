import { useEffect, useState } from 'react';
import { formatGrade, getRemarks, isValidGrade } from '../../lib/utils.js';
import { getDescriptorForGradeLevel } from '../../lib/grading.js';
import { saveGrade } from '../../services/academicRecords.js';
import { useToast } from '../../context/ToastContext.jsx';

function GradeInputCell({ value, disabled, saving, onCommit, label }) {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => { setDraft(value ?? ''); }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={draft}
      disabled={disabled || saving}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => { if (draft !== (value ?? '')) onCommit(draft); }}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      placeholder="—"
      className="no-print mx-auto block h-8 w-14 rounded-md border border-slate-300 bg-white px-1 text-right text-sm font-semibold tabular-nums shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:bg-slate-50 disabled:text-slate-400"
    />
  );
}

function DescriptorCell({ gradeLevel, finalGrade }) {
  const { descriptor, filipinoDescriptor } = getDescriptorForGradeLevel(gradeLevel, finalGrade);
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

export default function GradeTable({ gradeLevel, subjects, periods, finalLabel, generalAverage, scale, teacherId, studentId, schoolYear, editableSubjectIds, onSaved }) {
  const showRemarks = true;
  const toast = useToast();
  const [savingKey, setSavingKey] = useState('');
  const canEdit = (subjectId) => Boolean(teacherId) && (editableSubjectIds ?? []).includes(subjectId);

  async function commitGrade(subject, period, raw) {
    const trimmed = raw.trim();
    if (trimmed !== '' && !isValidGrade(trimmed)) {
      toast.error('Enter a grade from 0 to 100.');
      return;
    }
    const key = `${subject.subjectId}:${period.field}`;
    setSavingKey(key);
    try {
      await saveGrade({
        teacherId, studentId, classId: subject.classId,
        subjectId: subject.subjectId, schoolYear, quarter: period.field, value: trimmed,
      });
      onSaved?.();
    } catch (err) {
      toast.error(err.message || 'Could not save this grade.');
    } finally {
      setSavingKey('');
    }
  }

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
                <td key={p.id} className="px-3 py-2 text-right tabular-nums">
                  {canEdit(s.subjectId) ? (
                    <>
                      <GradeInputCell
                        label={`${s.subjectName}, ${p.label} grade`}
                        disabled={Boolean(savingKey)}
                        value={s[p.field] != null ? String(s[p.field]) : ''}
                        saving={savingKey === `${s.subjectId}:${p.field}`}
                        onCommit={(raw) => commitGrade(s, p, raw)}
                      />
                      <span className="hidden print:inline">{formatGrade(s[p.field])}</span>
                    </>
                  ) : (
                    formatGrade(s[p.field])
                  )}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatGrade(s.finalGrade)}</td>
              <td className="px-4 py-2 text-slate-600">
                <DescriptorCell gradeLevel={gradeLevel} finalGrade={s.finalGrade} />
              </td>
              {showRemarks ? (
                <td className="px-4 py-2 text-slate-600">{getDescriptorForGradeLevel(gradeLevel, s.finalGrade).remarks || '—'}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
            <td className="px-4 py-2.5" colSpan={periods.length + 1}>
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

