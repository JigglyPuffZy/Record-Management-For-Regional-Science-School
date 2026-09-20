import { useMemo, useState } from 'react';
import { Search, Printer, Users, GraduationCap } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SF10View from '../../components/sf10/SF10View.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getStudentsForTeacher, getClassLabel, getSF10 } from '../../services/academicRecords.js';
import { cn } from '../../lib/utils.js';

export default function TeacherAcademicRecords() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const students = getStudentsForTeacher(user.id);
  const [selectedId, setSelectedId] = useState(students[0]?.studentId ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q));
  }, [students, query]);

  const sf10 = selectedId ? getSF10(selectedId) : null;

  return (
    <PageContainer title="Academic Records" icon={GraduationCap} description="View the SF10 record of any student assigned to you.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="no-print h-fit">
          <CardBody>
            <Input icon={Search} placeholder="Search students" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-3" />
            <div className="max-h-[32rem] space-y-1 overflow-y-auto scrollbar-thin">
              {filtered.length === 0 ? (
                <EmptyState icon={Users} title="No students found" />
              ) : (
                filtered.map((s) => (
                  <button
                    key={s.studentId}
                    type="button"
                    onClick={() => setSelectedId(s.studentId)}
                    className={cn(
                      'flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors',
                      selectedId === s.studentId
                        ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                        : 'text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <span className="text-sm font-semibold">{s.name}</span>
                    <span className="text-xs text-slate-500">{s.studentId} &middot; {getClassLabel(s.classId)}</span>
                  </button>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        <div>
          {sf10 ? (
            <>
              <div className="no-print mb-4 flex justify-end">
                <Button icon={Printer} onClick={() => window.print()}>
                  Print SF10
                </Button>
              </div>
              <SF10View sf10={sf10} />
            </>
          ) : (
            <Card>
              <CardBody>
                <EmptyState icon={Users} title="Select a student" description="Choose a student from the list to view their SF10." />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
