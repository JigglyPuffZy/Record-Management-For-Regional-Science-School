import { Save } from 'lucide-react';
import { Table, THead, TBody, Th, Td } from '../ui/Table.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import GradeInput from './GradeInput.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { formatGrade } from '../../lib/utils.js';
import { Search } from 'lucide-react';

function DescriptorBadge({ row }) {
  if (row.finalGrade === null) return <span className="text-slate-400">&mdash;</span>;
  if (row.filipinoDescriptor) {
    return (
      <span className="text-xs font-semibold text-slate-700">
        {row.descriptor}
        <br />
        <span className="font-normal text-slate-500">({row.filipinoDescriptor})</span>
      </span>
    );
  }
  return <Badge tone={row.remarks === 'Passed' ? 'brand' : 'rose'}>{row.descriptor}</Badge>;
}

export default function ClassRecordTable({
  rows,
  activePeriod,
  periods,
  values,
  invalidIds,
  dirtyIds,
  onChange,
  onSaveRow,
  finalLabel = 'Final Rating',
}) {
  if (rows.length === 0) {
    return <EmptyState icon={Search} title="No students match your search" description="Try a different name or LRN." />;
  }

  return (
    <Table>
      <THead>
        <tr>
          <Th>LRN</Th>
          <Th>Student Name</Th>
          {periods.map((p) => (
            <Th key={p.id} align="right" className={p.id === activePeriod ? 'text-brand-700' : undefined}>
              {p.label}
            </Th>
          ))}
          <Th align="right">{finalLabel}</Th>
          <Th>Descriptor</Th>
          <Th align="right">Action</Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => {
          const studentId = row.student.studentId;
          const isDirty = dirtyIds.has(studentId);
          const isInvalid = invalidIds.has(studentId);
          return (
            <tr key={studentId} className={isDirty ? 'bg-brand-50/60' : undefined}>
              <Td className="font-medium text-slate-500">{row.student.lrn}</Td>
              <Td className="font-medium text-slate-900">{row.student.name}</Td>
              {periods.map((p) =>
                p.id === activePeriod ? (
                  <td key={p.id} className="px-4 py-2 text-right">
                    <GradeInput
                      ariaLabel={`${row.student.name} ${p.label} grade`}
                      value={values[studentId] ?? ''}
                      onChange={(val) => onChange(studentId, val)}
                      invalid={isInvalid}
                    />
                  </td>
                ) : (
                  <Td key={p.id} align="right" className="tabular-nums text-slate-500">
                    {formatGrade(row[p.field])}
                  </Td>
                ),
              )}
              <Td align="right" className="font-semibold tabular-nums text-slate-900">
                {formatGrade(row.finalGrade)}
              </Td>
              <Td>
                <DescriptorBadge row={row} />
              </Td>
              <Td align="right">
                {isDirty ? (
                  <Button size="sm" variant="subtle" icon={Save} onClick={() => onSaveRow(studentId)} disabled={isInvalid}>
                    Save
                  </Button>
                ) : (
                  <Badge tone="slate">Saved</Badge>
                )}
              </Td>
            </tr>
          );
        })}
      </TBody>
    </Table>
  );
}
