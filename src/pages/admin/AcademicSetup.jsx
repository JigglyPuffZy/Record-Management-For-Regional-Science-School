import { useCallback, useEffect, useState } from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { apiPost } from '../../lib/api.js';
import { formatClassLabel } from '../../lib/utils.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function AcademicSetup() {
  const toast = useToast();
  const [data, setData] = useState({ years: [], classes: [], subjects: [], teachers: [], students: [], assignments: [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sourceClass, setSourceClass] = useState('');
  const [outcome, setOutcome] = useState('promote');
  const [targetClass, setTargetClass] = useState('');
  const [selected, setSelected] = useState([]);
  const [assignmentClass, setAssignmentClass] = useState('');
  const [assignmentSubject, setAssignmentSubject] = useState('');
  const load = useCallback(async () => {
    try { setData(await apiPost('/api/academic-workflows', { action: 'options' })); setError(''); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function submit(event, action, extra = {}) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true); setError('');
    try {
      await apiPost('/api/academic-workflows', { action, ...values, ...extra });
      toast.success('Academic setup saved.');
      if (action === 'advance') setSelected([]);
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const classOptions = data.classes.map(cls => ({ value: cls.id, label: `${formatClassLabel(cls.grade_level, cls.section)} · ${cls.school_year_id}` }));
  const years = data.years.map(year => ({ value: year.id, label: `${year.label}${year.is_active ? ' (active)' : ''}` }));
  const teachers = data.teachers.map(teacher => ({ value: teacher.linked_id, label: teacher.name }));
  const source = data.classes.find(cls => cls.id === sourceClass);
  const destination = data.classes.find(cls => cls.id === targetClass);
  const destinations = data.classes.filter(cls => source && cls.school_year_id > source.school_year_id && Number(cls.grade_level.replace('Grade ', '')) === Number(source.grade_level.replace('Grade ', '')) + (outcome === 'promote' ? 1 : 0));
  const assigned = data.assignments.find(item => item.class_id === assignmentClass && item.subject_id === assignmentSubject);
  const reason = id => <Input id={`${id}-reason`} name="reason" label="Reason / verification note" required maxLength={1500}/>;
  const save = label => <Button type="submit" disabled={busy}>{busy ? 'Saving…' : label}</Button>;
  const panel = (title, children) => <Card><CardBody><h2 className="mb-4 text-lg font-bold">{title}</h2>{children}</CardBody></Card>;
  return <PageContainer title="Academic setup" icon={Settings} description="Prepare classes and teachers, preserve completed years, and manage enrollment progression." actions={<Button variant="secondary" icon={RefreshCw} onClick={load} disabled={busy}>Refresh</Button>}>
    {error && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
    <p className="mb-5 rounded-xl bg-brand-50 p-4 text-sm text-brand-900">Prepare the next school year, create its sections, and assign subject teachers. Complete each learner’s enrollment decision before activating the new year. Existing records stay attached to the learner’s LRN.</p>
    <div className="grid gap-5 lg:grid-cols-2">
      {panel('1. Prepare a school year', <form className="space-y-4" onSubmit={event => submit(event, 'year', { activate: false })}>
        <Input id="new-year" name="schoolYear" label="School year" required placeholder="2027-2028" pattern="[0-9]{4}-[0-9]{4}"/>
        {reason('new-year')}{save('Create school year')}
      </form>)}
      {panel('2. Create a class / section', <form className="space-y-4" onSubmit={event => submit(event, 'class')}>
        <Select id="class-year" name="schoolYear" label="School year" required placeholder="Choose a year" options={years}/>
        <Select id="class-grade" name="gradeLevel" label="Grade level" options={[7, 8, 9, 10].map(grade => ({ value: `Grade ${grade}`, label: `Grade ${grade}` }))}/>
        <Input id="class-section" name="section" label="Section" required maxLength={100} placeholder="Archimedes"/>
        <Select id="class-adviser" name="adviserId" label="Class adviser" placeholder="Choose an approved teacher" options={teachers}/>
        {reason('class')}{save('Create section')}
      </form>)}
      {panel('3. Assign subject teachers', <form className="space-y-4" onSubmit={event => submit(event, 'assignment')}>
        <Select id="assignment-class" name="classId" label="Class / section" required placeholder="Choose a class" options={classOptions} value={assignmentClass} onChange={event => setAssignmentClass(event.target.value)}/>
        <Select id="assignment-subject" name="subjectId" label="Subject (including Research)" required placeholder="Choose a subject" options={data.subjects.map(subject => ({ value: subject.id, label: subject.name }))} value={assignmentSubject} onChange={event => setAssignmentSubject(event.target.value)}/>
        <p className="text-sm text-slate-600">Current teacher: {data.teachers.find(teacher => teacher.linked_id === assigned?.teacher_id)?.name || (assigned ? assigned.teacher_id : 'Unassigned')}. Saving replaces this subject’s teaching assignment for the selected class.</p>
        <Select id="assignment-teacher" name="teacherId" label="Approved teacher" required placeholder="Choose a teacher" options={teachers}/>
        {reason('assignment')}{save('Confirm teaching assignment')}
      </form>)}
      {panel('4. Close records and confirm enrollment', <form className="space-y-4" onSubmit={event => submit(event, 'advance', { studentIds: selected, outcome, targetClassId: outcome === 'graduate' ? null : targetClass })}>
        <Select id="source-class" label="Current class" required placeholder="Choose a class" options={classOptions} value={sourceClass} onChange={event => { setSourceClass(event.target.value); setSelected([]); setTargetClass(''); }}/>
        <Select id="enrollment-outcome" label="Confirmed outcome" value={outcome} options={[{ value: 'promote', label: 'Promote to the next grade' }, { value: 'retain', label: 'Retain in the same grade next year' }, { value: 'graduate', label: 'Graduate (Grade 10 only)' }]} onChange={event => { setOutcome(event.target.value); setTargetClass(''); }}/>
        {outcome !== 'graduate' && <Select id="target-class" label="Next class / section" required placeholder="Choose a later school year" value={targetClass} onChange={event => setTargetClass(event.target.value)} options={destinations.map(cls => ({ value: cls.id, label: `${formatClassLabel(cls.grade_level, cls.section)} · ${cls.school_year_id}` }))}/>}
        <fieldset className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3"><legend className="text-sm font-semibold">Select learners (up to 100)</legend>{data.students.filter(student => student.class_id === sourceClass).map(student => <label className="flex items-center gap-2 text-sm" key={student.student_id}><input type="checkbox" checked={selected.includes(student.student_id)} onChange={event => setSelected(prev => event.target.checked ? [...prev, student.student_id] : prev.filter(id => id !== student.student_id))}/>{student.display_name} · {student.lrn}</label>)}</fieldset>
        <p className="text-sm text-slate-600">{selected.length} selected. {source && `${source.grade_level} · ${source.school_year_id}`} → {outcome === 'graduate' ? 'Graduated' : destination ? `${formatClassLabel(destination.grade_level, destination.section)} · ${destination.school_year_id}` : 'Choose destination'}. All subject grades must be complete. The previous year will be preserved in SF10.</p>
        {reason('advance')}
        <label className="flex gap-2 text-sm"><input type="checkbox" required/>I verified the grades and enrollment decision for these learners.</label>
        <Button type="submit" disabled={busy || !selected.length}>{busy ? 'Saving…' : 'Preserve records and confirm enrollment'}</Button>
      </form>)}
      {panel('5. Activate the new school year', <form className="space-y-4" onSubmit={event => submit(event, 'year', { activate: true })}>
        <Select id="activate-year" name="schoolYear" label="School year" required placeholder="Choose a year" options={years}/>
        <p className="text-sm text-slate-600">Grade entry will use this year. Every active learner must already be enrolled in it; graduated learners keep access to their completed records.</p>
        {reason('activate')}
        <label className="flex gap-2 text-sm"><input type="checkbox" required/>I have completed and checked the enrollment transitions.</label>
        {save('Activate school year')}
      </form>)}
    </div>
  </PageContainer>;
}
