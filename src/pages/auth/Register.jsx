import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, UserPlus, Users, UserRound } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiPost, dashboardFor } from '../../lib/api.js';
import { SCHOOL } from '../../data/schools.js';
import AppLogo from '../../components/ui/AppLogo.jsx';

export default function Register({ teacherMode = false }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ role: teacherMode ? 'student' : 'teacher', firstName: '', lastName: '', middleName: '', email: '', teacherId: '', lrn: '', position: '', classId: '', birthdate: '', sex: 'Male', verification: '', password: '', confirmPassword: '' });
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { apiPost('/api/access', { action: teacherMode ? 'teacher-options' : 'options' }).then(data => setClasses(data.classes)).catch(err => setError(err.message)); }, [teacherMode]);
  if (user && !teacherMode) return <Navigate to={dashboardFor(user.role)} replace />;
  const set = key => event => setForm(prev => ({ ...prev, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try { await apiPost(teacherMode ? '/api/create-student' : '/api/access', { ...form, action: 'register' }); setForm(prev => ({ ...prev, password: '', confirmPassword: '' })); setSubmitted(true); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const content = <Card><CardBody>{submitted ? <div className="space-y-4 py-8 text-center" role="status"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600"/><h2 className="text-xl font-bold">{teacherMode ? 'Student account submitted' : 'Registration submitted'}</h2><p className="text-slate-600">{teacherMode ? 'The student account is pending administrator approval. The learner will appear in your roster once approved and can then sign in with their LRN and the password you set.' : 'Your account is pending approval. Please contact the school office to confirm your teacher or student identity, then sign in once approved.'}</p><Link to={teacherMode ? '/teacher/students' : '/login'} className="inline-block font-semibold text-brand-700 underline">{teacherMode ? 'Back to students' : 'Return to sign in'}</Link>{teacherMode && <Button variant="secondary" className="ml-3" onClick={() => { setSubmitted(false); setForm(prev => ({ ...prev, firstName: '', lastName: '', middleName: '', email: '', lrn: '', birthdate: '', verification: '' })); }}>Create another account</Button>}</div> : <form onSubmit={submit} className="space-y-5">
      {!teacherMode && <div role="group" aria-label="Register as"><p className="mb-2 text-sm font-medium text-slate-700">Register as</p><div className="grid grid-cols-2 gap-3">{[{ value: 'teacher', label: 'Teacher', icon: Users }, { value: 'student', label: 'Student', icon: UserRound }].map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={form.role === value} onClick={() => setForm(prev => ({ ...prev, role: value }))} className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-semibold ${form.role === value ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Icon className="h-5 w-5"/>{label}</button>)}</div></div>}
      <div className="grid gap-4 sm:grid-cols-2"><Input id="first-name" label="First name" required value={form.firstName} onChange={set('firstName')}/><Input id="last-name" label="Last name" required value={form.lastName} onChange={set('lastName')}/></div>
      <Input id="middle-name" label="Middle name (optional)" value={form.middleName} onChange={set('middleName')}/>
      <Input id="contact-email" label="Contact email" type="email" required value={form.email} onChange={set('email')} autoComplete="email"/>
      {form.role === 'teacher' ? <><Input id="teacher-id" label="Teacher / employee ID" required value={form.teacherId} onChange={set('teacherId')} hint="Use the ID the school can verify."/><Input id="position" label="Position" required value={form.position} onChange={set('position')} placeholder="e.g. Teacher I"/></> : <><Input id="lrn" label="Learner Reference Number (LRN)" required inputMode="numeric" pattern="[0-9]{12}" maxLength={12} value={form.lrn} onChange={set('lrn')}/><div className="grid gap-4 sm:grid-cols-2"><Input id="birthdate" label="Birthdate" type="date" required max={new Date().toISOString().slice(0, 10)} value={form.birthdate} onChange={set('birthdate')}/><Select id="sex" label="Sex" value={form.sex} onChange={set('sex')} options={['Male', 'Female'].map(value => ({ value, label: value }))}/></div></>}
      <Select id="class" label={form.role === 'teacher' ? 'Requested teaching section' : 'Class section'} required value={form.classId} onChange={set('classId')} placeholder="Select a section" options={classes.map(cls => ({ value: cls.id, label: `${cls.grade_level} – ${cls.section} (${cls.school_year_id})` }))}/>
      <div><label htmlFor="verification" className="mb-2 block text-sm font-medium text-slate-700">Details for school verification</label><textarea id="verification" required maxLength={1500} value={form.verification} onChange={set('verification')} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder={form.role === 'teacher' ? 'Department, subjects taught, and school office contact who can confirm your employment.' : 'Adviser name and enrollment details the school can check.'}/><p className="mt-1 text-xs text-slate-500">Do not include passwords or government ID numbers here.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><Input id="new-password" label="Password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={set('password')}/><Input id="confirm-password" label="Confirm password" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={set('confirmPassword')}/></div>
      <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><ShieldCheck className="h-5 w-5 shrink-0"/>Registration does not grant access. An administrator must approve your account.</p>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {teacherMode && !classes.length && !error && <p className="text-sm text-slate-500">You need an assigned section before you can create student accounts.</p>}
      <Button type="submit" disabled={busy || !classes.length} className="w-full">{busy ? 'Submitting…' : teacherMode ? 'Create student account for approval' : 'Submit for verification'}</Button>
    </form>}</CardBody></Card>
  ;
  if (teacherMode) return <PageContainer title="Create Student Account" icon={UserPlus} description="Register a learner in one of your assigned sections. The administrator will verify and approve their access."><div className="mx-auto max-w-2xl">{content}</div></PageContainer>;
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16"><div className="mx-auto max-w-2xl">
    <Link to="/login" className="text-sm font-semibold text-brand-700">← Back to sign in</Link>
    <div className="mt-6 inline-flex rounded-full bg-brand-700"><AppLogo className="h-20 w-20" /></div>
    <div className="my-6"><p className="text-xs font-bold uppercase tracking-widest text-brand-700">{SCHOOL.name}</p><h1 className="mt-3 text-3xl font-bold text-slate-900">Register your account</h1><p className="mt-2 text-sm text-slate-600">Your school administrator will verify your identity before granting access.</p></div>
    {content}
  </div></main>;
}
