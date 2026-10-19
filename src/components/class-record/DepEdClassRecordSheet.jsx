import { useMemo } from 'react';
import { Save, Printer, ClipboardList, Search } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import ScoreCell from './ScoreCell.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ClassRecordGuide from './ClassRecordGuide.jsx';
import Input from '../ui/Input.jsx';
import { formatGrade, cn } from '../../lib/utils.js';
import {
  WW_COUNT,
  PT_COUNT,
  QA_COUNT,
  formatRecordName,
  computeInitialGrade,
} from '../../lib/classRecordSheet.js';
import { transmuteInitialGrade } from '../../lib/transmutation.js';

function GroupHeader({ title, detail, tone, colSpan = 1, rowSpan = 1 }) {
  return (
    <th className={cn('cr-th', `cr-th--${tone}`)} colSpan={colSpan} rowSpan={rowSpan} scope="colgroup">
      <span className="cr-th-title">{title}</span>
      {detail ? <span className="cr-th-detail">{detail}</span> : null}
    </th>
  );
}

export default function DepEdClassRecordSheet({
  subjectName,
  classLabel,
  schoolYear,
  periodLabel,
  gradeComponents,
  rows,
  scoresByStudent,
  invalidCells,
  dirtyIds,
  onScoreChange,
  onSaveRow,
  searchQuery,
  onSearchChange,
  onSaveAll,
  pendingSaveCount,
}) {
  const wwCols = useMemo(() => Array.from({ length: WW_COUNT }, (_, i) => i), []);
  const ptCols = useMemo(() => Array.from({ length: PT_COUNT }, (_, i) => i), []);
  const exCols = useMemo(() => Array.from({ length: QA_COUNT }, (_, i) => i), []);

  const wwPct = Math.round((gradeComponents?.ww ?? 0.2) * 100);
  const ptPct = Math.round((gradeComponents?.pt ?? 0.5) * 100);
  const exPct = Math.round((gradeComponents?.ex ?? 0.3) * 100);

  if (!rows.length) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No students in this class"
        description="Enroll learners first, then return to enter scores."
      />
    );
  }

  const dirtyCount = pendingSaveCount ?? dirtyIds.size;

  return (
    <div className="cr-workspace">
      <header className="cr-hero">
        <div className="cr-hero-glow" aria-hidden="true" />
        <div className="cr-hero-inner">
          <div className="cr-hero-copy">
            <p className="cr-hero-eyebrow">Grading workspace</p>
            <h2 className="cr-hero-title">{subjectName}</h2>
            <p className="cr-hero-sub">
              {classLabel} · {periodLabel} · SY {schoolYear}
            </p>
          </div>
          <div className="cr-hero-chips">
            <span className="cr-chip">
              <span className="cr-chip-dot cr-chip-dot--ww" />
              WW {wwPct}%
            </span>
            <span className="cr-chip">
              <span className="cr-chip-dot cr-chip-dot--pt" />
              PT {ptPct}%
            </span>
            <span className="cr-chip">
              <span className="cr-chip-dot cr-chip-dot--ex" />
              EX {exPct}%
            </span>
          </div>
        </div>
      </header>

      <ClassRecordGuide gradeComponents={gradeComponents} />

      <div className="cr-toolbar no-print">
        <div className="cr-toolbar-search">
          <Input
            icon={Search}
            placeholder="Search student or LRN"
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        <div className="cr-toolbar-actions">
          <Button type="button" variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>
            Print
          </Button>
          <Button icon={Save} size="sm" onClick={onSaveAll} disabled={!dirtyCount}>
            Save all ({dirtyCount})
          </Button>
        </div>
      </div>

      <div className="cr-grid-shell">
        <div className="cr-grid-scroll">
          <table className="cr-table">
            <caption className="sr-only">
              Class record for {subjectName}, {classLabel}, {periodLabel}
            </caption>
            <thead>
              <tr className="cr-head-row">
                <GroupHeader title="#" tone="index" rowSpan={2} />
                <GroupHeader title="Learner" detail="Name & LRN" tone="name" rowSpan={2} />
                <GroupHeader title="Written Works" detail={`${wwPct}%`} tone="ww" colSpan={WW_COUNT} />
                <GroupHeader title="Performance Tasks" detail={`${ptPct}%`} tone="pt" colSpan={PT_COUNT} />
                <GroupHeader title="Examinations" detail={`${exPct}%`} tone="qa" colSpan={QA_COUNT} />
                <GroupHeader title="Initial" detail="Weighted" tone="initial" rowSpan={2} />
                <GroupHeader title="Transmuted" detail="Posted" tone="transmuted" rowSpan={2} />
                <GroupHeader title="Final" detail="Year" tone="final" rowSpan={2} />
                <th className="cr-th cr-th--action no-print" rowSpan={2} scope="col">
                  <span className="cr-th-title">Action</span>
                </th>
              </tr>
              <tr className="cr-subhead-row">
                {wwCols.map((i) => (
                  <th key={`ww-${i}`} className="cr-th cr-th--sub cr-th--ww-sub" scope="col">W{i + 1}</th>
                ))}
                {ptCols.map((i) => (
                  <th key={`pt-${i}`} className="cr-th cr-th--sub cr-th--pt-sub" scope="col">P{i + 1}</th>
                ))}
                {exCols.map((i) => (
                  <th key={`ex-${i}`} className="cr-th cr-th--sub cr-th--qa-sub" scope="col">E{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const studentId = row.student.studentId;
                const scores = scoresByStudent[studentId];
                const initial = scores ? computeInitialGrade(scores, gradeComponents) : null;
                const transmuted = initial != null ? transmuteInitialGrade(initial) : null;
                const isDirty = dirtyIds.has(studentId);
                const name = formatRecordName(row.student);

                return (
                  <tr key={studentId} className={cn('cr-body-row', isDirty && 'cr-body-row--dirty')}>
                    <td className="cr-td cr-td--index">{index + 1}</td>
                    <th className="cr-td cr-td--name" scope="row">
                      <span className="cr-student-name">{name}</span>
                      <span className="cr-student-lrn">LRN {row.student.lrn}</span>
                    </th>
                    {wwCols.map((i) => {
                      const key = `${studentId}:ww:${i}`;
                      return (
                        <td key={key} className="cr-td cr-td--score cr-td--ww">
                          <ScoreCell
                            ariaLabel={`${name}, written work ${i + 1}`}
                            value={scores?.ww[i] ?? ''}
                            invalid={invalidCells.has(key)}
                            onChange={(val) => onScoreChange(studentId, 'ww', i, val)}
                          />
                        </td>
                      );
                    })}
                    {ptCols.map((i) => {
                      const key = `${studentId}:pt:${i}`;
                      return (
                        <td key={key} className="cr-td cr-td--score cr-td--pt">
                          <ScoreCell
                            ariaLabel={`${name}, performance task ${i + 1}`}
                            value={scores?.pt[i] ?? ''}
                            invalid={invalidCells.has(key)}
                            onChange={(val) => onScoreChange(studentId, 'pt', i, val)}
                          />
                        </td>
                      );
                    })}
                    {exCols.map((i) => {
                      const key = `${studentId}:qa:${i}`;
                      return (
                        <td key={key} className="cr-td cr-td--score cr-td--qa">
                          <ScoreCell
                            ariaLabel={`${name}, examination ${i + 1}`}
                            value={scores?.qa[i] ?? ''}
                            invalid={invalidCells.has(key)}
                            onChange={(val) => onScoreChange(studentId, 'qa', i, val)}
                          />
                        </td>
                      );
                    })}
                    <td className="cr-td cr-td--result">
                      <span className="cr-result-pill">{initial != null ? formatGrade(initial) : '—'}</span>
                    </td>
                    <td className="cr-td cr-td--result cr-td--transmuted">
                      {transmuted != null ? (
                        <span className="cr-result-pill cr-result-pill--primary">{transmuted}</span>
                      ) : initial != null ? (
                        <span className="cr-result-na" title="Outside transmutation table">N/A</span>
                      ) : (
                        <span className="cr-result-pill cr-result-pill--muted">—</span>
                      )}
                    </td>
                    <td className="cr-td cr-td--result">
                      <span className="cr-result-pill cr-result-pill--muted">
                        {formatGrade(row.finalGrade)}
                      </span>
                    </td>
                    <td className="cr-td cr-td--action no-print">
                      {isDirty ? (
                        <Button size="sm" variant="subtle" icon={Save} onClick={() => onSaveRow(studentId)}>
                          Save
                        </Button>
                      ) : (
                        <Badge tone="emerald">Synced</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="cr-grid-hint no-print">
          Scroll horizontally for score columns · Transmuted grade is saved to SF10
        </p>
      </div>
    </div>
  );
}
