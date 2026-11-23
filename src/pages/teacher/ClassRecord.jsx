import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListChecks, ClipboardList } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DepEdClassRecordSheet from '../../components/class-record/DepEdClassRecordSheet.jsx';
import GradeSummary from '../../components/class-record/GradeSummary.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  getTeachingAssignments,
  getClassRecordRows,
  getActiveSchoolYear,
  getGradingPeriodsForClass,
  getClassById,
  getClassLabel,
  saveGrade,
  saveGradesBulk,
  subscribeToGrades,
  GradeValidationError,
} from '../../services/academicRecords.js';
import { getSubjectById } from '../../data/subjects.js';
import { isValidGrade } from '../../lib/utils.js';
import {
  sheetStorageKey,
  loadSheetScores,
  saveSheetScores,
  createEmptyScoreSet,
  normalizeScoreSet,
  computeInitialGrade,
  loadSheetTotalPoints,
  saveSheetTotalPoints,
  collectInvalidScoreCells,
  isBlankScore,
} from '../../lib/classRecordSheet.js';
import { getGradeComponentsForSubject } from '../../lib/gradeComponents.js';
import { transmuteInitialGrade } from '../../lib/transmutation.js';

function buildScoresState(rows, stored) {
  const next = {};
  for (const row of rows) {
    const id = row.student.studentId;
    next[id] = normalizeScoreSet(stored[id]);
  }
  return next;
}

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
  const periods = getGradingPeriodsForClass(classId);

  const subjectOptions = useMemo(
    () => assignments.filter((a) => a.classId === classId).map((a) => ({ value: a.subjectId, label: a.subjectName })),
    [assignments, classId],
  );

  const [subjectId, setSubjectId] = useState(() => searchParams.get('subjectId') || subjectOptions[0]?.value || '');
  const [gradingPeriod, setGradingPeriod] = useState(() => periods[0]?.id ?? 'term1');
  const [query, setQuery] = useState('');

  const [scoresByStudent, setScoresByStudent] = useState({});
  const [totalPoints, setTotalPoints] = useState(createEmptyScoreSet);
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [invalidCells, setInvalidCells] = useState(new Set());
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
  const subjectName =
    getSubjectById(subjectId)?.name ?? subjectOptions.find((s) => s.value === subjectId)?.label ?? '—';
  const gradeComponents = useMemo(
    () => getGradeComponentsForSubject(subjectId, subjectName),
    [subjectId, subjectName],
  );

  const resolveTermGrade = useCallback(
    (scores) => {
      const initial = scores ? computeInitialGrade(scores, gradeComponents, totalPoints) : null;
      const transmuted = initial != null ? transmuteInitialGrade(initial) : null;
      return { initial, transmuted };
    },
    [gradeComponents, totalPoints],
  );

  const storageKey = useMemo(
    () => (classId && subjectId && gradingPeriod
      ? sheetStorageKey({ classId, subjectId, schoolYear, periodId: gradingPeriod })
      : null),
    [classId, subjectId, schoolYear, gradingPeriod],
  );

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
    if (!storageKey || !rows.length) {
      setScoresByStudent({});
      setTotalPoints(createEmptyScoreSet());
      setDirtyIds(new Set());
      setInvalidCells(new Set());
      return;
    }
    const stored = loadSheetScores(storageKey);
    const nextScores = buildScoresState(rows, stored);
    const nextTotals = loadSheetTotalPoints(storageKey, stored);
    saveSheetTotalPoints(storageKey, nextTotals);
    setScoresByStudent(nextScores);
    setTotalPoints(nextTotals);
    setInvalidCells(collectInvalidScoreCells(nextScores, nextTotals));

    const dirty = new Set();
    for (const row of rows) {
      const id = row.student.studentId;
      const initial = computeInitialGrade(nextScores[id] ?? createEmptyScoreSet(), gradeComponents, nextTotals);
      const transmuted = initial === null ? null : transmuteInitialGrade(initial);
      const saved = activeField ? row[activeField] : null;
      if (transmuted != null && transmuted !== saved) dirty.add(id);
    }
    setDirtyIds(dirty);
  }, [storageKey, rows, activeField, gradeComponents]);

  const persistScores = useCallback((nextScores) => {
    if (storageKey) saveSheetScores(storageKey, nextScores);
  }, [storageKey]);

  const filteredRows = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      row.student.name.toLowerCase().includes(q) ||
      row.student.lrn.includes(q) ||
      row.student.studentId.toLowerCase().includes(q)
    );
  });

  function handleScoreChange(studentId, category, index, raw) {
    setScoresByStudent((prev) => {
      const current = prev[studentId] ?? createEmptyScoreSet();
      const nextSet = {
        ...current,
        [category]: current[category].map((v, i) => (i === index ? raw : v)),
      };
      const next = { ...prev, [studentId]: nextSet };
      persistScores(next);
      setInvalidCells(collectInvalidScoreCells(next, totalPoints));
      return next;
    });
    setDirtyIds((prev) => new Set(prev).add(studentId));
  }

  function handleTotalPointsChange(category, index, raw) {
    const nextTotals = { ...totalPoints, [category]: totalPoints[category].map((value, i) => i === index ? raw : value) };
    setTotalPoints(nextTotals);
    if (storageKey) saveSheetTotalPoints(storageKey, nextTotals);
    setInvalidCells(collectInvalidScoreCells(scoresByStudent, nextTotals));
    setDirtyIds(prev => new Set([...prev, ...Object.entries(scoresByStudent).filter(([, scores]) => Object.values(scores).some(values => values.some(value => !isBlankScore(value)))).map(([id]) => id)]));
  }

  async function handleSaveRow(studentId) {
    const errors = collectInvalidScoreCells({ [studentId]: scoresByStudent[studentId] ?? createEmptyScoreSet() }, totalPoints);
    if (errors.size) {
      toast.error('Enter positive total points and scores from 0 up to their total points.');
      return;
    }
    const scores = scoresByStudent[studentId];
    const { initial, transmuted } = resolveTermGrade(scores);
    if (initial === null) {
      toast.error('Enter at least one score so the system can compute the initial grade.');
      return;
    }
    if (transmuted === null) {
      toast.error(
        'Initial grade is outside the SY 2026–2027 transmutation table. Adjust scores or verify manually.',
      );
      return;
    }
    if (!isValidGrade(String(transmuted))) {
      toast.error('Invalid transmuted grade. Please check entered scores.');
      return;
    }
    try {
      await saveGrade({
        teacherId: user.id,
        studentId,
        classId,
        subjectId,
        schoolYear,
        quarter: gradingPeriod,
        value: String(transmuted),
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
    if (invalidCells.size > 0) {
      toast.error('Enter positive total points and scores from 0 up to their total points.');
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSaveAll() {
    if (collectInvalidScoreCells(scoresByStudent, totalPoints).size) {
      toast.error('Correct the scores and total points before saving.');
      return;
    }
    setSaving(true);
    try {
      const entries = [...dirtyIds].map((studentId) => {
        const { transmuted } = resolveTermGrade(scoresByStudent[studentId] ?? createEmptyScoreSet());
        return {
          teacherId: user.id,
          studentId,
          classId,
          subjectId,
          schoolYear,
          quarter: gradingPeriod,
          value: transmuted != null ? String(transmuted) : '',
        };
      }).filter((e) => e.value !== '');
      if (!entries.length) {
        toast.error('No computed grades to save.');
        return;
      }
      await saveGradesBulk(entries);
      setDirtyIds(prev => { const remaining = new Set(prev); entries.forEach(entry => remaining.delete(entry.studentId)); return remaining; });
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
  const classLabel = cls ? getClassLabel(classId) : '—';

  return (
    <PageContainer
      title="Class Record"
      icon={ClipboardList}
      description="Enter scores over their total points. The system computes percentage scores, applies subject weights and transmutation, and saves the term grade to each student's SF10."
    >
      <Card className="mb-5 no-print">
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} options={classOptions} />
          <Select label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={subjectOptions} />
          <Input label="School Year" value={schoolYear} disabled readOnly />
          <Select
            label="Grading period"
            value={gradingPeriod}
            onChange={(e) => setGradingPeriod(e.target.value)}
            options={periods.map((p) => ({ value: p.id, label: p.label }))}
          />
        </CardBody>
      </Card>

      {rows.length > 0 ? (
        <>
          <div className="mb-5 no-print">
            <GradeSummary rows={rows} activePeriod={gradingPeriod} periods={periods} />
          </div>

          <DepEdClassRecordSheet
            subjectName={subjectName}
            classLabel={classLabel}
            schoolYear={schoolYear}
            periodLabel={periodLabel}
            gradeComponents={gradeComponents}
            rows={filteredRows}
            scoresByStudent={scoresByStudent}
            totalPoints={totalPoints}
            onTotalPointsChange={handleTotalPointsChange}
            invalidCells={invalidCells}
            dirtyIds={dirtyIds}
            onScoreChange={handleScoreChange}
            onSaveRow={handleSaveRow}
            searchQuery={query}
            onSearchChange={setQuery}
            onSaveAll={handleSaveAll}
            pendingSaveCount={dirtyIds.size}
          />
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
        title="Save all term grades?"
        message={`You are about to save ${dirtyIds.size} transmuted term grade${dirtyIds.size === 1 ? '' : 's'} for ${periodLabel} (SY 2026–2027 table). Each student's class record and SF10 will be updated right away.`}
        confirmLabel="Save all"
      />
    </PageContainer>
  );
}
