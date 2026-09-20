import { UserCircle, Mail, Hash, School, MapPin, Calendar, BookOpen } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getTeacher, getTeachingAssignments, getSchool, getActiveSchoolYear } from '../../services/academicRecords.js';
import { initials } from '../../lib/utils.js';

export default function TeacherProfile() {
  const { user } = useAuth();
  const teacher = getTeacher(user.id);
  const assignments = getTeachingAssignments(user.id);
  const school = getSchool();
  if (!teacher) return null;

  const fields = [
    { icon: Hash, label: 'Teacher ID', value: teacher.teacherId },
    { icon: Mail, label: 'Email', value: teacher.email },
    { icon: Calendar, label: 'School Year', value: getActiveSchoolYear() },
    { icon: School, label: 'School', value: school.name },
    { icon: MapPin, label: 'Division', value: school.division },
  ];

  return (
    <PageContainer title="Profile" icon={UserCircle} description="Your teacher information on file.">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardBody>
            <div className="mb-8 flex flex-col items-center border-b border-slate-100 pb-8 sm:flex-row sm:items-start sm:gap-6">
              <span className="avatar-well h-20 w-20 text-2xl">
                {initials(teacher.name)}
              </span>
              <div className="mt-4 text-center sm:mt-0 sm:text-left">
                <h2 className="text-xl font-bold text-slate-900">{teacher.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{teacher.email}</p>
                <div className="mt-3">
                  <Badge tone="brand">{teacher.position}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 rounded-xl bg-slate-50/80 p-4">
                  <span className="icon-well-sm flex-shrink-0 text-brand-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-600" />
              <h3 className="text-base font-semibold text-slate-900">Teaching Assignments</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {assignments.map((a) => (
                <Badge key={`${a.classId}-${a.subjectId}`} tone="slate">
                  {a.classLabel} · {a.subjectName}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
