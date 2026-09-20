import { useEffect, useState } from 'react';
import { Printer, FileText } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import Button from '../../components/ui/Button.jsx';
import SF10View from '../../components/sf10/SF10View.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getSF10, subscribeToGrades } from '../../services/academicRecords.js';

export default function StudentSF10() {
  const { user } = useAuth();
  const [sf10, setSf10] = useState(() => getSF10(user.id));

  useEffect(() => subscribeToGrades(() => setSf10(getSF10(user.id))), [user.id]);

  return (
    <PageContainer
      title="My SF10"
      icon={FileText}
      description="Learner's Permanent Academic Record — view only"
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
