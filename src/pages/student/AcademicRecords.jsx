import { useEffect, useMemo, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Select from '../../components/ui/Select.jsx';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getSF10, getSubjects, subscribeToGrades } from '../../services/academicRecords.js';
import { getGradingPeriodsForGradeLevel } from '../../data/curriculum.js';
import { formatGrade, getRemarks } from '../../lib/utils.js';
import { getDescriptorForGradeLevel } from '../../lib/grading.js';
import { FolderSearch, BookOpen } from 'lucide-react';

export default function StudentAcademicRecords() {
  const { user } = useAuth();
  const [sf10, setSf10] = useState(() => getSF10(user.id));
  useEffect(() => subscribeToGrades(() => setSf10(getSF10(user.id))), [user.id]);

  const yearOptions = useMemo(() => {
    if (!sf10) return [];
    const current = { value: sf10.currentYear.schoolYear, label: `${sf10.currentYear.schoolYear} (Current)`, gradeLevel: sf10.currentYear.gradeLevel };
    const past = sf10.history.map((h) => ({ value: h.schoolYear, label: h.schoolYear, gradeLevel: h.gradeLevel }));
    return [current, ...past];
  }, [sf10]);

  const [schoolYear, setSchoolYear] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    if (yearOptions.length > 0 && !schoolYear) setSchoolYear(yearOptions[0].value);
  }, [yearOptions, schoolYear]);

  if (!sf10) return null;

  const activeYearOption = yearOptions.find((y) => y.value === schoolYear);
  const isCurrent = schoolYear === sf10.currentYear.schoolYear;
  const yearRecord = isCurrent ? sf10.currentYear : sf10.history.find((h) => h.schoolYear === schoolYear);
  const gradeLevel = activeYearOption?.gradeLevel ?? 'Grade 7';
  const periods = isCurrent
    ? sf10.currentYear.gradingPeriods
    : getGradingPeriodsForGradeLevel(gradeLevel);
  const isGrade10 = gradeLevel === 'Grade 10';

  const subjectRows = yearRecord?.subjects ?? [];
  const filteredRows = subjectRows.filter((s) => subjectFilter === 'all' || s.subjectId === subjectFilter);

  const periodOptions = [
    { value: 'all', label: 'All Terms' },
    ...periods.map((p) => ({ value: p.field, label: p.label })),
  ];

  return (
    <PageContainer
      title="Academic Records"
      icon={BookOpen}
      description="Filter and review your grades by school year, subject, and grading period."
    >
      <Card className="mb-5">
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Select label="School Year" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} options={yearOptions} />
          <Select label="Grade Level" value={activeYearOption?.gradeLevel ?? ''} disabled options={activeYearOption ? [{ value: activeYearOption.gradeLevel, label: activeYearOption.gradeLevel }] : []} />
          <Select
            label="Subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            options={[{ value: 'all', label: 'All Subjects' }, ...getSubjects().map((s) => ({ value: s.id, label: s.name }))]}
          />
          <Select label="Term" value={period} onChange={(e) => setPeriod(e.target.value)} options={periodOptions} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-5">
          {filteredRows.length === 0 ? (
            <EmptyState icon={FolderSearch} title="No records found" description="Try adjusting your filters." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Subject</Th>
                  {isCurrent ? <Th>Teacher</Th> : null}
                  {(period === 'all' ? periods.map((p) => p.field) : [period]).map((field) => {
                    const p = periods.find((x) => x.field === field);
                    return <Th key={field} align="right">{p?.label ?? field}</Th>;
                  })}
                  <Th align="right">Final Rating</Th>
                  <Th>Descriptor</Th>
                  {!isGrade10 ? <Th>Remarks</Th> : null}
                </tr>
              </THead>
              <TBody>
                {filteredRows.map((s) => {
                  const eval_ = getDescriptorForGradeLevel(gradeLevel, s.finalGrade);
                  return (
                    <tr key={s.subjectId}>
                      <Td className="font-medium text-slate-900">{s.subjectName}</Td>
                      {isCurrent ? <Td>{s.teacherName}</Td> : null}
                      {(period === 'all' ? periods.map((p) => p.field) : [period]).map((field) => (
                        <Td key={field} align="right" className="tabular-nums">{formatGrade(s[field])}</Td>
                      ))}
                      <Td align="right" className="font-semibold tabular-nums">{formatGrade(s.finalGrade)}</Td>
                      <Td className="text-slate-600">
                        {s.finalGrade === null ? '—' : (
                          <>
                            {eval_.descriptor}
                            {eval_.filipinoDescriptor ? <span className="block text-xs text-slate-500">({eval_.filipinoDescriptor})</span> : null}
                          </>
                        )}
                      </Td>
                      {!isGrade10 ? (
                        <Td>
                          {s.finalGrade === null ? (
                            <Badge tone="amber">In progress</Badge>
                          ) : (
                            <Badge tone={getRemarks(s.finalGrade) === 'Passed' ? 'emerald' : 'rose'}>{getRemarks(s.finalGrade)}</Badge>
                          )}
                        </Td>
                      ) : null}
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </PageContainer>
  );
}
