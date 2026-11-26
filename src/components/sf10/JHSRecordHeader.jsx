export default function JHSRecordHeader({ year }) {
  return <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-800 sm:grid-cols-[auto_auto_auto_1fr_auto]">
    <p>Classified as Grade: <strong>{year.gradeLevel.replace('Grade ', '')}</strong></p>
    <p>Section: <strong>{year.section || '—'}</strong></p>
    <p>School Year: <strong>{year.schoolYear || '—'}</strong></p>
    <p>Name of Adviser/Teacher: <strong>{year.adviser || '—'}</strong></p>
    <p>Signature: <span className="inline-block w-20 border-b border-slate-600"/></p>
  </div>;
}
