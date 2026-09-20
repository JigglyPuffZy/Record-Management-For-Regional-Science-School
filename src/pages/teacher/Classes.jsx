import { Link } from 'react-router-dom';
import { Users, ArrowRight, School } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getClassesForTeacher, getClassLabel, getRoster, getTeachingAssignments } from '../../services/academicRecords.js';

export default function TeacherClasses() {
  const { user } = useAuth();
  const classes = getClassesForTeacher(user.id);
  const assignments = getTeachingAssignments(user.id);

  if (classes.length === 0) {
    return (
      <PageContainer title="My Classes" icon={School} description="Sections you are assigned to teach or advise this school year.">
        <EmptyState icon={School} title="No classes assigned" description="No classes are currently assigned to you." />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="My Classes" icon={School} description="Sections you are assigned to teach or advise this school year.">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((cls) => {
          const subjects = assignments.filter((a) => a.classId === cls.id).map((a) => a.subjectName);
          const isAdviser = cls.adviserId === user.id;
          const studentCount = getRoster(cls.id).length;

          return (
            <Card key={cls.id} className="group flex flex-col transition-shadow hover:shadow-md hover:shadow-slate-900/[0.04]">
              <CardBody className="flex flex-1 flex-col">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <School className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-bold text-slate-900">{getClassLabel(cls.id)}</p>
                      <p className="text-xs text-slate-500">SY {cls.schoolYear}</p>
                    </div>
                  </div>
                  {isAdviser ? <Badge tone="brand">Adviser</Badge> : null}
                </div>

                <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                  <Users className="h-4 w-4" />
                  <span>{studentCount} student{studentCount !== 1 ? 's' : ''}</span>
                </div>

                <div className="mb-5 flex flex-1 flex-wrap gap-1.5">
                  {subjects.map((s) => (
                    <Badge key={s} tone="slate">{s}</Badge>
                  ))}
                </div>

                <Link
                  to={`/teacher/classes/${cls.id}`}
                  className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-700 transition-all group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-700"
                >
                  View Class <ArrowRight className="h-4 w-4" />
                </Link>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
