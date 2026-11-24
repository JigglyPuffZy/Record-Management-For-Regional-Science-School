import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Clock3, Users, GraduationCap, RefreshCw, Check, X } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody, StatCard } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { apiPost } from '../../lib/api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { formatClassLabel } from '../../lib/utils.js';

const date = value => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const tone = status => status === 'approved' ? 'emerald' : status === 'rejected' ? 'rose' : 'amber';

export default function AdminPortal({ view }) {
  const toast = useToast();
  const [data, setData] = useState({ accounts: [], classes: [], subjects: [], assignments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('pending');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState('approved');
  const [classId, setClassId] = useState('');
  const [subjectIds, setSubjectIds] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await apiPost('/api/admin', { action: 'list' })); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  function review(account, value) {
    setSelected(account); setDecision(value); setClassId(account.details.classId || ''); setSubjectIds([]); setNote('');
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true);
    try {
      await apiPost('/api/admin', { action: 'review', accountId: selected.id, decision, classId, subjectIds, note });
      setSelected(null); toast.success(decision === 'approved' ? 'Account approved. They can now sign in.' : 'Registration declined.'); await load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }
  const pending = data.accounts.filter(a => a.status === 'pending');
  const approved = data.accounts.filter(a => a.status === 'approved' && a.role !== 'admin');
  const filtered = data.accounts.filter(account => account.role !== 'admin' && (role === 'all' || account.role === role) && (view === 'accounts' ? account.status === 'approved' : status === 'all' || account.status === status) && `${account.name} ${account.email} ${account.identifier}`.toLowerCase().includes(query.toLowerCase()));
  const titles = { dashboard: 'Admin overview', registrations: 'Registration verification', accounts: 'Approved accounts' };
  function accountCard(account) {
    const cls = data.classes.find(c => c.id === (account.details.approvedClassId || account.details.classId));
    const assignments = data.assignments.filter(a => a.teacher_id === account.linked_id);
    return <Card key={account.id}><CardBody>
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-900">{account.name}</h2><p className="break-all text-sm text-slate-500">{account.email}</p></div><div className="flex gap-2"><Badge tone="slate">{account.role}</Badge><Badge tone={tone(account.status)}>{account.status}</Badge></div></div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs text-slate-500">{account.role === 'teacher' ? 'Teacher ID' : 'LRN'}</dt><dd className="font-semibold">{account.identifier.toUpperCase()}</dd></div><div><dt className="text-xs text-slate-500">{account.status === 'approved' ? 'Confirmed section' : 'Requested section'}</dt><dd>{cls ? formatClassLabel(cls.grade_level, cls.section) : 'Existing account'}</dd></div><div><dt className="text-xs text-slate-500">Submitted</dt><dd>{date(account.created_at)}</dd></div></dl>
      {account.details.position && <p className="mt-3 text-sm text-slate-600">Position: {account.details.position}</p>}
      {account.details.registrationSource === 'teacher' && <p className="mt-3 text-sm font-medium text-brand-700">Submitted by teacher: {account.details.submittedByName}</p>}
      {account.role === 'student' && account.details.birthdate && <p className="mt-3 text-sm text-slate-600">Birthdate: {account.details.birthdate} · Sex: {account.details.sex}</p>}
      {account.details.verification && <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Verification details</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{account.details.verification}</p></div>}
      {account.status === 'pending' ? <div className="mt-4 flex flex-wrap gap-2"><Button icon={Check} onClick={() => review(account, 'approved')}>Review &amp; approve</Button><Button variant="secondary" icon={X} onClick={() => review(account, 'rejected')}>Decline</Button></div> : <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600"><p className="whitespace-pre-wrap break-words">{account.review_note}</p>{account.reviewed_at && <p className="mt-1 text-xs">Reviewed {date(account.reviewed_at)} by {data.accounts.find(a => a.id === account.reviewed_by)?.name || 'Administrator'}</p>}{assignments.length > 0 && <p className="mt-2">Subjects: {assignments.map(a => data.subjects.find(s => s.id === a.subject_id)?.name || a.subject_id).join(', ')}</p>}</div>}
    </CardBody></Card>;
  }
  return <PageContainer title={titles[view]} icon={ShieldCheck} description="Verify school identities and control who can access learner records." actions={<Button variant="secondary" icon={RefreshCw} disabled={loading} onClick={load}>Refresh</Button>}>
    <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-5"><p className="font-semibold text-brand-900">Administrator workspace</p><p className="mt-1 text-sm text-brand-800">Confirm teachers with school personnel records and students with enrollment records before approval. Teachers enter grades in their own portal.</p></div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
    {loading ? <p role="status" className="py-8 text-slate-500">Loading accounts…</p> : view === 'dashboard' ? <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3"><StatCard label="Awaiting verification" value={pending.length} icon={Clock3} tone="amber"/><StatCard label="Approved teachers" value={approved.filter(a => a.role === 'teacher').length} icon={Users}/><StatCard label="Approved students" value={approved.filter(a => a.role === 'student').length} icon={GraduationCap}/></div>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Pending registrations</h2><Link to="/admin/registrations" className="text-sm font-semibold text-brand-700 underline">View all</Link></div>
      <div className="space-y-4">{pending.length ? pending.slice(0, 5).map(accountCard) : <Card><CardBody><p className="text-slate-500">No registrations awaiting verification.</p></CardBody></Card>}</div>
    </> : <>
      <Card className="mb-5"><CardBody className="grid gap-4 sm:grid-cols-3"><Input id="account-search" label="Search accounts" placeholder="Name, ID, LRN, or email" value={query} onChange={event => setQuery(event.target.value)}/><Select id="role-filter" label="Role" value={role} onChange={event => setRole(event.target.value)} options={[{ value: 'all', label: 'Teachers & students' }, { value: 'teacher', label: 'Teachers' }, { value: 'student', label: 'Students' }]}/>{view !== 'accounts' && <Select id="status-filter" label="Status" value={status} onChange={event => setStatus(event.target.value)} options={['pending', 'approved', 'rejected', 'all'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))}/>}</CardBody></Card>
      <div className="space-y-4">{filtered.length ? filtered.map(accountCard) : <Card><CardBody><p className="text-slate-500">No accounts match these filters.</p></CardBody></Card>}</div>
    </>}
    <Modal open={!!selected} onClose={() => !saving && setSelected(null)} title={decision === 'approved' ? 'Verify and approve account' : 'Decline registration'}>
      {selected && <form onSubmit={submit} className="space-y-5"><p className="text-sm"><strong>{selected.name}</strong> · {selected.role}<br/>{selected.email}</p>
        {decision === 'approved' && <><Select id="review-class" label={selected.role === 'teacher' ? 'Assign teaching section' : 'Confirm enrollment section'} required value={classId} onChange={event => { setClassId(event.target.value); setSubjectIds([]); }} placeholder="Choose a class" options={data.classes.map(cls => ({ value: cls.id, label: `${formatClassLabel(cls.grade_level, cls.section)} (${cls.school_year_id})` }))}/>
          {selected.role === 'teacher' && <fieldset><legend className="mb-2 text-sm font-semibold">Assign subjects</legend><p className="mb-3 text-xs text-slate-500">Already assigned subjects are unavailable.</p><div className="grid gap-2 sm:grid-cols-2">{data.subjects.map(subject => {
            const assigned = data.assignments.some(a => a.class_id === classId && a.subject_id === subject.id && data.accounts.some(account => account.linked_id === a.teacher_id && account.role === 'teacher' && account.status === 'approved'));
            return <label key={subject.id} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${assigned ? 'text-slate-400' : ''}`}><input type="checkbox" disabled={assigned} checked={subjectIds.includes(subject.id)} onChange={event => setSubjectIds(prev => event.target.checked ? [...prev, subject.id] : prev.filter(id => id !== subject.id))}/>{subject.name}</label>;
          })}</div></fieldset>}
        </>}
        <div><label htmlFor="review-note" className="mb-2 block text-sm font-semibold">{decision === 'approved' ? 'How did you verify this person?' : 'Reason for declining'}</label><textarea id="review-note" required maxLength={1500} rows={3} value={note} onChange={event => setNote(event.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder={decision === 'approved' ? 'e.g. Confirmed with the registrar / personnel office.' : 'Explain why the registration could not be verified.'}/></div>
        <p className="text-xs text-slate-500">This decision and your verification note will be recorded.</p>
        <div className="flex flex-wrap gap-2"><Button type="submit" variant={decision === 'approved' ? 'primary' : 'danger'} disabled={saving || (decision === 'approved' && selected.role === 'teacher' && !subjectIds.length)}>{saving ? 'Saving…' : decision === 'approved' ? 'Confirm approval' : 'Confirm decline'}</Button><Button variant="secondary" disabled={saving} onClick={() => setSelected(null)}>Cancel</Button></div>
      </form>}
    </Modal>
  </PageContainer>;
}
