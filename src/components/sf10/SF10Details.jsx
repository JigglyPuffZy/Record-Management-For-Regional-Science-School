import { useEffect, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { formatDate } from '../../lib/utils.js';
import { apiPost } from '../../lib/api.js';
import { hydrateRecords, getSF10 } from '../../services/academicRecords.js';
import { useToast } from '../../context/ToastContext.jsx';
import Button from '../ui/Button.jsx';

const learnerFields = [
  ['lastName', 'Last Name'], ['firstName', 'First Name'], ['middleName', 'Middle Name'], ['nameExtension', 'Name Extension'],
  ['lrn', 'LRN'], ['birthdate', 'Birthdate', 'date'], ['sex', 'Sex', 'sex'],
];
const eligibilityFields = [
  ['basis', 'Basis of Admission'], ['elementarySchool', 'Elementary School'], ['schoolId', 'School ID'],
  ['schoolAddress', 'School Address'], ['generalAverage', 'General Average', 'number'], ['graduationYear', 'School Year Graduated'],
  ['assessmentRating', 'PEPT / ALS Rating'], ['assessmentDate', 'Date of Examination', 'date'],
  ['assessmentCenter', 'Assessment Center'], ['otherCredential', 'Other Credential'],
  ['schoolYearEnrolled', 'School Year Enrolled (Grade 7)'], ['eligible', 'Eligible for Enrollment', 'eligible'],
];
const inputClass = 'no-print min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 disabled:bg-slate-50';

function snapshotFor(sf10) {
  const learner = Object.fromEntries(learnerFields.map(([key]) => [key, String(sf10.learner[key] ?? '')]));
  const details = Object.fromEntries(eligibilityFields.map(([key]) => [key, key === 'eligible' ? (sf10.eligibility?.[key] == null ? '' : String(sf10.eligibility[key])) : String(sf10.eligibility?.[key] ?? '')]));
  return { learner, details, expected: sf10.versions || {} };
}
function display(value, type) {
  if (type === 'eligible') return value === 'true' ? 'Yes' : value === 'false' ? 'No' : 'Not verified';
  return type === 'date' ? formatDate(value) : value || '—';
}
function DetailField({ label, name, value, saved, type = 'text', editable, disabled, onChange }) {
  const controlId = `sf10-${name}`;
  const options = type === 'sex' ? [['Male', 'Male'], ['Female', 'Female']] : [['', 'Not verified'], ['true', 'Yes'], ['false', 'No']];
  return <div className="flex flex-wrap items-center gap-2 border-b border-dotted border-slate-300 pb-1">
    <label htmlFor={editable ? controlId : undefined} className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}:</label>
    {editable ? <>
      {['sex', 'eligible'].includes(type) ? <select id={controlId} className={inputClass} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select>
        : <input id={controlId} className={inputClass} value={value} disabled={disabled} type={type} onChange={event => onChange(event.target.value)}
          required={['lastName', 'firstName', 'lrn', 'birthdate'].includes(name)} maxLength={name === 'lrn' ? 12 : type === 'text' ? (learnerFields.some(([key]) => key === name) ? 200 : 400) : undefined}
          pattern={name === 'lrn' ? '[0-9]{12}' : undefined} inputMode={name === 'lrn' ? 'numeric' : undefined}
          min={type === 'number' ? 0 : undefined} max={type === 'number' ? 100 : undefined} step={type === 'number' ? '0.01' : undefined}/>} 
      <span className="hidden text-sm font-medium print:inline">{display(saved, type)}</span>
    </> : <span className="text-sm font-medium">{display(value, type)}</span>}
  </div>;
}

export default function SF10Details({ sf10, studentId, teacherId, onSaved }) {
  const editable = Boolean(teacherId && studentId);
  const snapshot = JSON.stringify(snapshotFor(sf10));
  const [baseline, setBaseline] = useState(() => JSON.parse(snapshot));
  const [draft, setDraft] = useState(() => JSON.parse(snapshot));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const toast = useToast();
  useEffect(() => {
    if (!dirtyRef.current) { const next = JSON.parse(snapshot); setBaseline(next); setDraft(next); }
  }, [snapshot]);

  function update(group, key, value) { setDraft(prev => ({ ...prev, [group]: { ...prev[group], [key]: value } })); setError(''); }
  async function reloadSaved() {
    setSaving(true); setError('');
    try {
      await hydrateRecords({ force: true });
      const next = snapshotFor(getSF10(studentId));
      dirtyRef.current = false; setBaseline(next); setDraft(next); setReason(''); onSaved?.();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const details = { ...draft.details, eligible: draft.details.eligible === '' ? null : draft.details.eligible === 'true' };
      const { result } = await apiPost('/api/academic-workflows', { action: 'sf10-details', studentId, learner: draft.learner, details, expected: baseline.expected, reason });
      const next = { ...draft, expected: result };
      dirtyRef.current = false; setBaseline(next); setDraft(next); setReason('');
      toast.success('Learner information and eligibility saved.');
      try { await hydrateRecords({ force: true }); onSaved?.(); }
      catch { setError('Saved successfully, but the portal could not refresh. Saved details will appear when the connection returns.'); }
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const field = (group, [key, label, type]) => <DetailField key={key} name={key} label={label} type={type} editable={editable} disabled={saving}
    value={draft[group][key]} saved={baseline[group][key]} onChange={value => update(group, key, value)}/>;
  return <form onSubmit={submit}>
    <section className="mb-6 print-avoid-break">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Learner’s Information</h4>
      <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {learnerFields.map(config => field('learner', config))}
        <DetailField name="status" label="Status" value={sf10.learner.status}/>
      </div>
      {editable && <p className="no-print mt-2 text-xs text-slate-500">Enrollment status is managed through Admin → Academics.</p>}
    </section>
    <section className="mb-6 rounded-lg border border-dashed border-slate-300 p-4 print-avoid-break">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Eligibility for JHS Enrollment</h4>
      <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">{eligibilityFields.map(config => field('details', config))}</div>
    </section>
    {editable && <div className="no-print mb-6 space-y-3 rounded-lg border border-brand-200 bg-brand-50 p-4 font-sans">
      <p className="text-sm text-brand-900">{dirty ? 'Unsaved changes — save learner details below.' : 'Edit the fields above, then save your changes.'} An LRN correction also changes the student’s login ID.</p>
      <label className="block text-sm font-medium text-slate-700" htmlFor="sf10-details-reason">Verification / reason for correction</label>
      <input id="sf10-details-reason" className={`${inputClass} w-full`} required maxLength={1500} value={reason} disabled={saving} onChange={event => setReason(event.target.value)} placeholder="e.g. Corrected using the verified enrollment record"/>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" icon={Save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save learner details'}</Button><Button type="button" variant="secondary" disabled={saving} onClick={reloadSaved}>Reload saved details</Button></div>
    </div>}
  </form>;
}
