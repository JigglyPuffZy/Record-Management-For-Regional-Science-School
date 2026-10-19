import { Save, Printer, ClipboardList } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import ScoreCell from './ScoreCell.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ClassRecordGuide from './ClassRecordGuide.jsx';
import { formatGrade, cn } from '../../lib/utils.js';
import {
  WW_COUNT,
  PT_COUNT,
  QA_COUNT,
  formatRecordName,
  computeInitialGrade,
} from '../../lib/classRecordSheet.js';
import { transmuteInitialGrade, TRANSMUTATION_SCHOOL_YEAR } from '../../lib/transmutation.js';
import { formatComponentWeights } from '../../lib/gradeComponents.js';

function GroupHeader({ title, detail, tone, colSpan = 1, rowSpan = 1 }) {
  return (
    <th className={`cr-th cr-th--${tone}`} colSpan={colSpan} rowSpan={rowSpan} scope="colgroup">
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
}) {
  if (!rows.length) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No students in this class"
        description="Enroll learners first, then return to enter scores."
      />
    );
  }

  const wwCols = Array.from({ length: WW_COUNT }, (_, i) => i);
  const ptCols = Array.from({ length: PT_COUNT }, (_, i) => i);
  const exCols = Array.from({ length: QA_COUNT }, (_, i) => i);

  const wwPct = Math.round((gradeComponents?.ww ?? 0.2) * 100);
  const ptPct = Math.round((gradeComponents?.pt ?? 0.5) * 100);
  const exPct = Math.round((gradeComponents?.ex ?? 0.3) * 100);
  const weightsLabel = gradeComponents ? formatComponentWeights(gradeComponents) : '';

  return (
    <div className="cr-sheet">
      <ClassRecordGuide gradeComponents={gradeComponents} />

      <div className="cr-sheet-actions no-print">
        <div className="cr-sheet-status-hints">
          <span className="cr-hint">
            <span className="cr-hint-swatch cr-hint-swatch--dirty" aria-hidden="true" />
            Highlighted row = not saved yet
          </span>
          <span className="cr-hint">Scores: 0–100 · Saved value = transmuted grade</span>
        </div>
        <Button type="button" variant="secondary" size="sm" icon={Printer} onClick={() => window.print()}>
          Print class record
        </Button>
      </div>

      <div className="cr-sheet-paper">
        <header className="cr-sheet-header">
          <div className="cr-sheet-header-grid">
            <p>
              <span className="cr-meta-label">Subject</span>
              <span className="cr-meta-value">{subjectName}</span>
            </p>
            <p>
              <span className="cr-meta-label">Class</span>
              <span className="cr-meta-value">{classLabel}</span>
            </p>
            <p>
              <span className="cr-meta-label">School year</span>
              <span className="cr-meta-value">{schoolYear}</span>
            </p>
            <p>
              <span className="cr-meta-label">Grading period</span>
              <span className="cr-meta-value">{periodLabel}</span>
            </p>
          </div>
          {weightsLabel ? (
            <p className="cr-sheet-weights no-print">{weightsLabel}</p>
          ) : null}
          <h2 className="cr-sheet-title">Class Record</h2>
          <p className="cr-sheet-subtitle">
            Initial grade → transmutation ({TRANSMUTATION_SCHOOL_YEAR}) → term grade saved to SF10
          </p>
        </header>

        <div className="cr-sheet-scroll">
          <table className="cr-table">
            <caption className="cr-table-caption">
              Scores for {subjectName}, {classLabel}, {periodLabel}.
            </caption>
            <thead>
              <tr>
                <GroupHeader title="#" detail="No." tone="index" rowSpan={2} />
                <GroupHeader title="Student name" detail="Last name, first name" tone="name" rowSpan={2} />
                <GroupHeader title="Written Works" detail={`${wwPct}% of initial`} tone="ww" colSpan={WW_COUNT} />
                <GroupHeader title="Performance Tasks" detail={`${ptPct}% of initial`} tone="pt" colSpan={PT_COUNT} />
                <GroupHeader title="Examinations" detail={`${exPct}% of initial`} tone="qa" colSpan={QA_COUNT} />
                <GroupHeader title="Initial grade" detail="Weighted average" tone="initial" rowSpan={2} />
                <GroupHeader title="Transmuted" detail="SY 2026–2027" tone="transmuted" rowSpan={2} />
                <GroupHeader title="Final rating" detail="Whole school year" tone="final" rowSpan={2} />
                <th className="cr-th cr-th--action no-print" rowSpan={2} scope="col">
                  <span className="cr-th-title">Status</span>
                </th>
              </tr>
              <tr className="cr-table-row--sub">
                {wwCols.map((i) => (
                  <th key={`ww-h-${i}`} className="cr-th cr-th--ww-sub" scope="col">WW{i + 1}</th>
                ))}
                {ptCols.map((i) => (
                  <th key={`pt-h-${i}`} className="cr-th cr-th--pt-sub" scope="col">PT{i + 1}</th>
                ))}
                {exCols.map((i) => (
                  <th key={`ex-h-${i}`} className="cr-th cr-th--qa-sub" scope="col">EX{i + 1}</th>
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
                  <tr key={studentId} className={cn(isDirty && 'cr-table-row--dirty')}>
                    <td className="cr-td cr-td--index">{index + 1}</td>
                    <th className="cr-td cr-td--name" scope="row">
                      <span className="cr-student-name">{name}</span>
                      <span className="cr-student-lrn">LRN {row.student.lrn}</span>
                    </th>
                    {wwCols.map((i) => {
                      const key = `${studentId}:ww:${i}`;
                      return (
                        <td key={key} className="cr-td cr-td--score">
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
                        <td key={key} className="cr-td cr-td--score">
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
                        <td key={key} className="cr-td cr-td--score">
                          <ScoreCell
                            ariaLabel={`${name}, examination ${i + 1}`}
                            value={scores?.qa[i] ?? ''}
                            invalid={invalidCells.has(key)}
                            onChange={(val) => onScoreChange(studentId, 'qa', i, val)}
                          />
                        </td>
                      );
                    })}
                    <td className="cr-td cr-td--computed">
                      <span className="cr-grade-value">{initial != null ? formatGrade(initial) : '—'}</span>
                    </td>
                    <td className="cr-td cr-td--computed cr-td--transmuted">
                      {transmuted != null ? (
                        <span className="cr-grade-value cr-grade-value--emphasis">{transmuted}</span>
                      ) : initial != null ? (
                        <span className="cr-grade-warning" title="Not on the official transmutation table (e.g. 51.34–69.99)">
                          N/A
                        </span>
                      ) : (
                        <span className="cr-grade-value">—</span>
                      )}
                    </td>
                    <td className="cr-td cr-td--computed cr-td--final">
                      <span className="cr-grade-value">{formatGrade(row.finalGrade)}</span>
                    </td>
                    <td className="cr-td cr-td--action no-print">
                      {isDirty ? (
                        <Button size="sm" variant="subtle" icon={Save} onClick={() => onSaveRow(studentId)}>
                          Save
                        </Button>
                      ) : (
                        <Badge tone="emerald">Saved</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="cr-sheet-footer">
          <p className="cr-sheet-footer-note">
            The <strong>transmuted</strong> grade is what is saved for {periodLabel} and shown on each student&apos;s SF10.
            Initial grades between 51.34 and 69.99 are not listed on the SY 2026–2027 table — verify with your registrar if needed.
          </p>
        </footer>
      </div>
    </div>
  );
}
