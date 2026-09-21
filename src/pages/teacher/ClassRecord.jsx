import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Save, ListChecks, ClipboardList } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import ClassRecordTable from '../../components/class-record/ClassRecordTable.jsx';
import GradeSummary from '../../components/class-record/GradeSummary.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  getTeachingAssignments,
  getClassRecordRows,
  getActiveSchoolYear,
  getGradingPeriodsForClass,
  getClassById,
  saveGrade,
  saveGradesBulk,
  subscribeToGrades,
  GradeValidationError,
} from '../../services/academicRecords.js';
import { getCurriculumForGradeLevel } from '../../data/curriculum.js';
import { isValidGrade } from '../../lib/utils.js';

export default function TeacherClassRecord() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const schoolYear = getActiveSchoolYear();

  const assignments = getTeachingAssignments(user.id);
  const classOptions = useMemo(() => {
    const seen = new Map();
    for (const a of assignments) seen.set(a.classId, a.classLabel);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [assignments]);

  const [classId, setClassId] = useState(() => searchParams.get('classId') || classOptions[0]?.value || '');
  const cls = getClassById(classId);
  const gradeLevel = cls?.gradeLevel ?? 'Grade 7';
  const periods = getGradingPeriodsForClass(classId);
  const curriculum = getCurriculumForGradeLevel(gradeLevel);

  const subjectOptions = useMemo(
    () => assignments.filter((a) => a.classId === classId).map((a) => ({ value: a.subjectId, label: a.subjectName })),
    [assignments, classId],
  );

  const [subjectId, setSubjectId] = useState(() => searchParams.get('subjectId') || subjectOptions[0]?.value || '');
  const [gradingPeriod, setGradingPeriod] = useState(() => periods[0]?.id ?? 'term1');
  const [query, setQuery] = useState('');

  const [values, setValues] = useState({});
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [invalidIds, setInvalidIds] = useState(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => subscribeToGrades(() => setRefreshTick((t) => t + 1)), []);

  useEffect(() => {
    const p = getGradingPeriodsForClass(classId);
    if (p.length > 0) setGradingPeriod(p[0].id);
  }, [classId]);

  const rows = useMemo(
    () => (classId && subjectId ? getClassRecordRows(classId, subjectId, schoolYear) : []),
    [classId, subjectId, schoolYear, refreshTick],
  );

  const activeField = periods.find((p) => p.id === gradingPeriod)?.field;

  useEffect(() => {
    if (!classOptions.some((c) => c.value === classId)) {
      setClassId(classOptions[0]?.value ?? '');
    }
  }, [classOptions, classId]);

  useEffect(() => {
    if (!subjectOptions.some((s) => s.value === subjectId)) {
      setSubjectId(subjectOptions[0]?.value ?? '');
    }
  }, [subjectOptions, subjectId]);

  useEffect(() => {
    if (classId && subjectId) setSearchParams({ classId, subjectId }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId]);

  useEffect(() => {
    const initial = {};
    for (const row of rows) {
      initial[row.student.studentId] = activeField ? row[activeField] ?? '' : '';
    }
    setValues(initial);
    setDirtyIds(new Set());
    setInvalidIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId, gradingPeriod, rows.length, activeField]);

  const filteredRows = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      row.student.name.toLowerCase().includes(q) ||
      row.student.lrn.includes(q) ||
      row.student.studentId.toLowerCase().includes(q)
    );
  });

  function handleChange(studentId, raw) {
    setValues((prev) => ({ ...prev, [studentId]: raw }));
    setDirtyIds((prev) => new Set(prev).add(studentId));
    setInvalidIds((prev) => {
      const next = new Set(prev);
      if (raw !== '' && !isValidGrade(raw)) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  }

  async function handleSaveRow(studentId) {
    try {
      await saveGrade({
        teacherId: user.id,
        studentId,
        classId,
        subjectId,
        schoolYear,
        quarter: gradingPeriod,
        value: values[studentId],
      });
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
      toast.success('Grade successfully saved.');
    } catch (err) {
      if (err instanceof GradeValidationError) toast.error(err.message);
      else toast.error(err.message || 'Something went wrong while saving. Please try again.');
    }
  }

  function handleSaveAll() {
    if (invalidIds.size > 0) {
      toast.error('Invalid grade. Please enter a value from 0 to 100.');
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSaveAll() {
    setSaving(true);
    try {
      const entries = [...dirtyIds].map((studentId) => ({
        teacherId: user.id,
        studentId,
        classId,
        subjectId,
        schoolYear,
        quarter: gradingPeriod,
        value: values[studentId],
      }));
      await saveGradesBulk(entries);
      setDirtyIds(new Set());
      toast.success('Grades successfully saved.');
      setConfirmOpen(false);
    } catch (err) {
      if (err instanceof GradeValidationError) toast.error(err.message);
      else toast.error(err.message || 'Something went wrong while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const periodLabel = periods.find((p) => p.id === gradingPeriod)?.label ?? gradingPeriod;

  return (
    <PageContainer
      title="Class Record"
      icon={ClipboardList}
      description={`Enter, edit, and save student grades for ${cls ? `${cls.gradeLevel} – ${cls.section}` : 'your assigned classes'}.`}
    >
      <Card className="mb-5">
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} options={classOptions} />
          <Select label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={subjectOptions} />
          <Input label="School Year" value={schoolYear} disabled readOnly />
          <Select
            label="Term"
            value={gradingPeriod}
            onChange={(e) => setGradingPeriod(e.target.value)}
            options={periods.map((p) => ({ value: p.id, label: p.label }))}
          />
        </CardBody>
      </Card>

      {rows.length > 0 ? (
        <>
          <div className="mb-5">
            <GradeSummary rows={rows} activePeriod={gradingPeriod} periods={periods} />
          </div>

          <Card>
            <CardBody className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="w-full max-w-xs">
                  <Input icon={Search} placeholder="Search by name or LRN" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <Button icon={Save} onClick={handleSaveAll} disabled={dirtyIds.size === 0}>
                  Save All ({dirtyIds.size})
                </Button>
              </div>
              <ClassRecordTable
                rows={filteredRows}
                activePeriod={gradingPeriod}
                periods={periods}
                values={values}
                invalidIds={invalidIds}
                dirtyIds={dirtyIds}
                onChange={handleChange}
                onSaveRow={handleSaveRow}
                finalLabel={curriculum.finalLabel}
              />
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-10 text-center text-slate-500">
            <ListChecks className="h-8 w-8 text-slate-600" />
            Select a class and subject to begin.
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmSaveAll}
        loading={saving}
        title="Save all grades?"
        message={`You are about to save ${dirtyIds.size} grade${dirtyIds.size === 1 ? '' : 's'} for ${periodLabel}. This will immediately update each student's academic record and SF10.`}
        confirmLabel="Save All"
      />
    </PageContainer>
  );
}
