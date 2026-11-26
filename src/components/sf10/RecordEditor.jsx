import { useState } from 'react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Modal from '../ui/Modal.jsx';
import { apiPost } from '../../lib/api.js';
import { hydrateRecords, getSubjectIdsForTeacherInClass, getSubjects } from '../../services/academicRecords.js';
import { getGradingPeriodsForGradeLevel } from '../../data/curriculum.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function RecordEditor({ sf10, studentId, teacherId, classId, onSaved, initialGradeLevel = 'Grade 7', initialYear, triggerLabel = 'Add prior record', hideCorrections = false }) {
  const toast = useToast();
  const [mode, setMode] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [grades, setGrades] = useState({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [priorRecord, setPriorRecord] = useState({});
  const year = sf10.history.find(item => item.schoolYear === schoolYear);
  const allowedSubjects = getSubjectIdsForTeacherInClass(teacherId, classId);
  const subjects = mode === 'prior-record' ? getSubjects().filter(subject => allowedSubjects.includes(subject.id)).map(subject => ({ subjectId: subject.id, subjectName: subject.name })) : year?.subjects.filter(subject => allowedSubjects.includes(subject.subjectId)) || [];
  const periods = mode === 'prior-record' ? getGradingPeriodsForGradeLevel(priorRecord.gradeLevel) : year?.gradingPeriods || [];
  function chooseSubject(id, record = year) {
    setSubjectId(id);
    const subject = record?.subjects.find(item => item.subjectId === id);
    setGrades(Object.fromEntries((mode === 'prior-record' ? periods : record?.gradingPeriods || []).map(period => [period.field, subject?.[period.field] ?? ''])));
  }
  function open(value) {
    setMode(value); setReason(''); setSchoolYear(initialYear?.schoolYear || ''); setSubjectId(''); setGrades({});
    setPriorRecord({ gradeLevel: initialGradeLevel, section: initialYear?.section || '', adviser: initialYear?.adviser || '',
      school: initialYear?.school || sf10.currentYear.school, schoolId: initialYear?.schoolId || sf10.currentYear.schoolId,
      district: initialYear?.district || sf10.currentYear.district, division: initialYear?.division || sf10.currentYear.division, region: initialYear?.region || sf10.currentYear.region });
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true);
    try {
      const numericGrades = Object.fromEntries(Object.entries(grades).map(([key, value]) => [key, value === '' ? null : Number(value)]));
      await apiPost('/api/academic-workflows', { action: mode, studentId, schoolYear, subjectId, grades: numericGrades, reason, ...priorRecord });
      await hydrateRecords({ force: true }); onSaved(); setMode(''); toast.success('Academic record saved. The student portal will refresh automatically.');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }
  return <>
    <Button variant="secondary" disabled={sf10.learner.gradeLevel === 'Grade 7'} onClick={() => open('prior-record')}>{triggerLabel}</Button>
    {!hideCorrections && <Button variant="secondary" disabled={!sf10.history.some(record => record.archiveId)} onClick={() => open('correct-history')}>Correct prior grades</Button>}
    <Modal open={!!mode} onClose={() => !saving && setMode('')} size="lg" title={mode === 'prior-record' ? 'Enter a verified prior academic record' : 'Correct a closed academic year'}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">{sf10.learner.name} · LRN {sf10.learner.lrn}</p>
        <p className="text-sm text-slate-600">Only your currently assigned subjects can be corrected. Final ratings and remarks are recalculated automatically, and the reason is recorded.</p>
        {mode === 'prior-record' ? <>
          <p className="text-sm text-slate-600">Copy verified grades from the learner’s existing SF10, one assigned subject at a time. Do not enter estimated grades.</p>
          <Input id="prior-year" label="Prior school year" required disabled={Boolean(initialYear?.schoolYear)} pattern="[0-9]{4}-[0-9]{4}" placeholder="2025-2026" value={schoolYear} onChange={event => setSchoolYear(event.target.value)}/>
          <Select id="prior-grade" label="Prior grade level" disabled={Boolean(initialYear)} options={[7, 8, 9].filter(grade => grade < Number(sf10.learner.gradeLevel.replace('Grade ', ''))).map(grade => ({ value: `Grade ${grade}`, label: `Grade ${grade}` }))} value={priorRecord.gradeLevel} onChange={event => setPriorRecord(prev => ({ ...prev, gradeLevel: event.target.value }))}/>
          <div className="grid gap-4 sm:grid-cols-2">{[['section', 'Section'], ['adviser', 'Adviser'], ['school', 'School name'], ['schoolId', 'School ID'], ['district', 'District'], ['division', 'Division'], ['region', 'Region']].map(([key, label]) => <Input key={key} id={`prior-${key}`} label={label} disabled={Boolean(initialYear?.schoolYear)} required={['section', 'school'].includes(key)} value={priorRecord[key] || ''} onChange={event => setPriorRecord(prev => ({ ...prev, [key]: event.target.value }))}/>)}</div>
        </> : <Select id="correction-year" label="Closed school year" required placeholder="Choose a year" value={schoolYear} options={sf10.history.filter(record => record.archiveId).map(record => ({ value: record.schoolYear, label: `${record.gradeLevel} · ${record.schoolYear}` }))} onChange={event => { setSchoolYear(event.target.value); setSubjectId(''); setGrades({}); }}/>}
        <Select id="correction-subject" label="Learning area" required placeholder="Choose your subject" value={subjectId} options={subjects.map(subject => ({ value: subject.subjectId, label: subject.subjectName }))} onChange={event => chooseSubject(event.target.value)}/>
        <div className="grid gap-3 sm:grid-cols-2">{subjectId && periods.map(period => <Input key={period.field} id={`correction-${period.field}`} label={period.label} type="number" required min="0" max="100" step="0.1" value={grades[period.field] ?? ''} onChange={event => setGrades(prev => ({ ...prev, [period.field]: event.target.value }))}/>)}</div>
        <Input id="record-change-reason" label="Verification / reason for change" required maxLength={1500} value={reason} onChange={event => setReason(event.target.value)}/>
        <Button type="submit" disabled={saving || (mode === 'correct-history' && !subjectId)}>{saving ? 'Saving…' : 'Save record'}</Button>
      </form>
    </Modal>
  </>;
}
