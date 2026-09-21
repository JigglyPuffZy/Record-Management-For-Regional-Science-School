import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardBody } from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  createStudentAccount,
  getActiveSchoolYear,
  getSchoolYears,
  getSectionsForGradeLevel,
  StudentAccountError,
} from '../../services/academicRecords.js';
import { GRADE_LEVELS } from '../../data/schools.js';

export default function CreateStudent() {
  const toast = useToast();
  const navigate = useNavigate();
  const schoolYear = getActiveSchoolYear();

  const [form, setForm] = useState({
    lrn: '',
    lastName: '',
    firstName: '',
    middleName: '',
    nameExtension: '',
    birthdate: '',
    sex: 'Male',
    gradeLevel: 'Grade 10',
    section: '',
    schoolYear,
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const sectionOptions = useMemo(() => {
    const classes = getSectionsForGradeLevel(form.gradeLevel, form.schoolYear);
    return classes.map((c) => ({ value: c.section, label: c.section }));
  }, [form.gradeLevel, form.schoolYear]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.section) {
      toast.error('Please select a section.');
      return;
    }
    setSubmitting(true);
    try {
      const { student, class: cls } = await createStudentAccount(form);
      toast.success(`${student.name} has been enrolled in ${cls.gradeLevel} – ${cls.section}.`);
      navigate('/teacher/students');
    } catch (err) {
      toast.error(err instanceof StudentAccountError ? err.message : 'Could not create student account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Create Student Account"
      icon={UserPlus}
      description="Enroll a new learner. They will automatically appear in the selected section's Class Record."
    >
      <Card className="mx-auto max-w-2xl">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="LRN (Learner Reference Number)" value={form.lrn} onChange={set('lrn')} placeholder="e.g. 123456789012" required />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Last Name" value={form.lastName} onChange={set('lastName')} required />
              <Input label="First Name" value={form.firstName} onChange={set('firstName')} required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Middle Name" value={form.middleName} onChange={set('middleName')} />
              <Input label="Name Extension" value={form.nameExtension} onChange={set('nameExtension')} placeholder="Jr., Sr., III" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Birthdate" type="date" value={form.birthdate} onChange={set('birthdate')} required />
              <Select
                label="Sex"
                value={form.sex}
                onChange={set('sex')}
                options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Grade Level"
                value={form.gradeLevel}
                onChange={(e) => setForm((prev) => ({ ...prev, gradeLevel: e.target.value, section: '' }))}
                options={GRADE_LEVELS.map((g) => ({ value: g, label: g }))}
              />
              <Select
                label="Section"
                value={form.section}
                onChange={set('section')}
                options={sectionOptions}
                placeholder="Select section"
              />
              <Select
                label="School Year"
                value={form.schoolYear}
                onChange={set('schoolYear')}
                options={getSchoolYears().map((y) => ({ value: y, label: y }))}
              />
            </div>
            <Input label="Password" type="password" value={form.password} onChange={set('password')} hint="Minimum 6 characters. Student will use LRN + this password to log in." required />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Student Account'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/teacher/students')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PageContainer>
  );
}
