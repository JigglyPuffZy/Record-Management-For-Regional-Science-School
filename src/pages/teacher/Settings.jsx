import { useState } from 'react';
import { Settings as SettingsIcon, RotateCcw, Lock } from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import { Card, CardHeader, CardBody } from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { resetMockData } from '../../services/academicRecords.js';
import { cn } from '../../lib/utils.js';

function useLocalToggle(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? raw === 'true' : initial;
    } catch { return initial; }
  });
  const toggle = () => {
    setValue((prev) => {
      const next = !prev;
      try { localStorage.setItem(key, String(next)); } catch { /* ignore */ }
      return next;
    });
  };
  return [value, toggle];
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button type="button" onClick={onChange} className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-3 text-left transition-colors hover:bg-slate-50">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      <span className={cn('relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors', checked ? 'bg-brand-700' : 'bg-slate-200')}>
        <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </span>
    </button>
  );
}

export default function TeacherSettings() {
  const toast = useToast();
  const [emailNotif, toggleEmail] = useLocalToggle('sf10_pref_email_notif', true);
  const [savedConfirm, toggleSavedConfirm] = useLocalToggle('sf10_pref_save_confirm', true);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!current || !next) { toast.error('Please fill in both password fields.'); return; }
    if (next.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    toast.success('Password updated for this session.');
    setCurrent('');
    setNext('');
  };

  const handleReset = () => {
    resetMockData();
    toast.success('Demo grade data has been reset to its original state.');
    setResetOpen(false);
  };

  return (
    <PageContainer title="Settings" icon={SettingsIcon} description="Manage your notification preferences and account security.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Notifications" subtitle="Choose what you want to be notified about" />
          <CardBody className="divide-y divide-slate-100">
            <Toggle checked={emailNotif} onChange={toggleEmail} label="Email notifications" description="Receive a copy of important updates by email" />
            <Toggle checked={savedConfirm} onChange={toggleSavedConfirm} label="Confirm before bulk save" description="Show a confirmation dialog before Save All" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Change Password" subtitle="Applies to this demo session only" />
          <CardBody>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input label="Current Password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              <Input label="New Password" type="password" value={next} onChange={(e) => setNext(e.target.value)} hint="Minimum 8 characters" />
              <Button type="submit" icon={Lock}>Update Password</Button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Demo Data" subtitle="Restore the original mock grades for this browser" />
          <CardBody>
            <p className="mb-4 text-sm leading-relaxed text-slate-500">
              This clears any grade edits made during this demo session and restores the original seed data. It does not affect any real backend.
            </p>
            <Button variant="danger" icon={RotateCcw} onClick={() => setResetOpen(true)}>
              Reset Demo Data
            </Button>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        variant="danger"
        title="Reset demo data?"
        message="This will discard every grade edit made during this session and restore the original mock data for all classes."
        confirmLabel="Reset Data"
      />
    </PageContainer>
  );
}
