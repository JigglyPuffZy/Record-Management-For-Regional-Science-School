import { useNavigate, useParams } from 'react-router-dom';
import { Printer, ShieldAlert, FileText } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SF10View from '../../components/sf10/SF10View.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { teacherCanViewStudent, getSF10 } from '../../services/academicRecords.js';

export default function TeacherStudentDetail() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const authorized = teacherCanViewStudent(user.id, studentId);
  const sf10 = authorized ? getSF10(studentId) : null;

  if (!authorized || !sf10) {
    return (
      <PageContainer title="Student Record">
        <EmptyState
          icon={ShieldAlert}
          title="You do not have access to this student"
          description="You can only view students enrolled in a class or subject assigned to you."
          action={<Button onClick={() => navigate('/teacher/students')}>Back to Students</Button>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={sf10.learner.name}
      icon={FileText}
      description={`${sf10.learner.gradeLevel} - ${sf10.learner.section} · LRN ${sf10.learner.lrn}`}
      actions={
        <Button icon={Printer} onClick={() => window.print()}>
          Print SF10
        </Button>
      }
    >
      <SF10View sf10={sf10} />
    </PageContainer>
  );
}
