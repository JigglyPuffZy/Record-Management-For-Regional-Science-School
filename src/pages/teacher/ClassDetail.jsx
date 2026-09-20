import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardEdit, ShieldAlert, School } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getClassById,
  getClassLabel,
  getClassRecordRows,
  getSubjectIdsForTeacherInClass,
  getSubjectById,
  getTeacher,
  getGradingPeriodsForClass,
} from '../../services/academicRecords.js';
import { getCurriculumForGradeLevel } from '../../data/curriculum.js';
import { formatGrade } from '../../lib/utils.js';
import { cn } from '../../lib/utils.js';

export default function TeacherClassDetail() {
  const { classId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const cls = getClassById(classId);
  const subjectIds = getSubjectIdsForTeacherInClass(user.id, classId);
  const [activeSubject, setActiveSubject] = useState(subjectIds[0] ?? null);
  const periods = getGradingPeriodsForClass(classId);
  const curriculum = getCurriculumForGradeLevel(cls?.gradeLevel ?? 'Grade 7');

  const rows = useMemo(
    () => (activeSubject ? getClassRecordRows(classId, activeSubject) : []),
    [classId, activeSubject],
  );

  if (!cls || subjectIds.length === 0) {
    return (
      <PageContainer title="Class Not Found">
        <EmptyState
          icon={ShieldAlert}
          title="You do not have access to this class"
          description="You can only view classes and subjects assigned to you."
          action={<Button onClick={() => navigate('/teacher/classes')}>Back to My Classes</Button>}
        />
      </PageContainer>
    );
  }

  const adviser = getTeacher(cls.adviserId);

  return (
    <PageContainer
      title={getClassLabel(cls.id)}
      icon={School}
      description={`School Year ${cls.schoolYear} · Adviser: ${adviser?.name ?? 'Unassigned'}`}
      actions={
        activeSubject ? (
          <Button
            icon={ClipboardEdit}
            onClick={() => navigate(`/teacher/class-record?classId=${classId}&subjectId=${activeSubject}`)}
          >
            Manage Grades
          </Button>
        ) : null
      }
    >
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1.5">
        {subjectIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSubject(id)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              activeSubject === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {getSubjectById(id)?.name ?? id}
          </button>
        ))}
      </div>

      <Card>
        <CardBody className="p-5">
          <p className="mb-3 text-sm text-slate-500">Students: {rows.length}</p>
          <Table>
            <THead>
              <tr>
                <Th>LRN</Th>
                <Th>Student Name</Th>
                {periods.map((p) => (
                  <Th key={p.id} align="right">{p.label}</Th>
                ))}
                <Th align="right">{curriculum.finalLabel}</Th>
                <Th>Descriptor</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((row) => (
                <tr key={row.student.studentId}>
                  <Td className="text-slate-500">{row.student.lrn}</Td>
                  <Td className="font-medium text-slate-900">{row.student.name}</Td>
                  {periods.map((p) => (
                    <Td key={p.id} align="right" className="tabular-nums">{formatGrade(row[p.field])}</Td>
                  ))}
                  <Td align="right" className="font-semibold tabular-nums">{formatGrade(row.finalGrade)}</Td>
                  <Td className="text-sm text-slate-600">
                    {row.descriptor ? (
                      <>
                        {row.descriptor}
                        {row.filipinoDescriptor ? <span className="block text-xs text-slate-500">({row.filipinoDescriptor})</span> : null}
                      </>
                    ) : '—'}
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </PageContainer>
  );
}
