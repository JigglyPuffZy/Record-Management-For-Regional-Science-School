import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Users, UserPlus } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getStudentsForTeacher, getClassesForTeacher, getClassLabel, getGeneralAverage, subscribeToGrades } from '../../services/academicRecords.js';
import { formatGrade } from '../../lib/utils.js';

export default function TeacherStudents() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  const [refresh, setRefresh] = useState(0);
  useEffect(() => subscribeToGrades(() => setRefresh((t) => t + 1)), []);

  const classes = getClassesForTeacher(user.id);
  const students = useMemo(() => getStudentsForTeacher(user.id), [user.id, refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const matchesClass = classFilter === 'all' || s.classId === classFilter;
      const matchesQuery =
        !q || s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || s.lrn.includes(q);
      return matchesClass && matchesQuery;
    });
  }, [students, query, classFilter]);

  return (
    <PageContainer
      title="Students"
      icon={Users}
      description="Every learner enrolled in a class or subject assigned to you."
      actions={
        <Link to="/teacher/students/create">
          <Button icon={UserPlus}>Create Student Account</Button>
        </Link>
      }
    >
      <Card className="mb-5">
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              label="Search"
              icon={Search}
              placeholder="Search by name or LRN"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            label="Section"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            options={[{ value: 'all', label: 'All Sections' }, ...classes.map((c) => ({ value: c.id, label: getClassLabel(c.id) }))]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-5">
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No students found" description="Try a different search term or section filter." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>LRN</Th>
                  <Th>Name</Th>
                  <Th>Section</Th>
                  <Th align="right">General Average</Th>
                  <Th align="right">Status</Th>
                  <Th align="right">Action</Th>
                </tr>
              </THead>
              <TBody>
                {filtered.map((s) => (
                  <tr key={s.studentId}>
                    <Td className="text-slate-500">{s.lrn}</Td>
                    <Td className="font-medium text-slate-900">{s.name}</Td>
                    <Td>{getClassLabel(s.classId)}</Td>
                    <Td align="right" className="tabular-nums">{formatGrade(getGeneralAverage(s.studentId))}</Td>
                    <Td align="right"><Badge tone="emerald">{s.status}</Badge></Td>
                    <Td align="right">
                      <Link to={`/teacher/students/${s.studentId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </PageContainer>
  );
}
