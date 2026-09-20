import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { GraduationCap, UserRound, Users, Eye, EyeOff, ArrowRight, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
const DEMO = {
  student: { id: '136045210001', password: 'student123' },
  teacher: { id: 'T-2001', password: 'teacher123' },
};

const ROLES = [
  { key: 'student', label: 'Student', description: 'View grades, SF10 & academic records', icon: UserRound },
  { key: 'teacher', label: 'Teacher', description: 'Manage class records & student accounts', icon: Users },
];

const FEATURES = [
  'Class records sync to SF10 instantly',
  'Grade 10 three-term curriculum support',
  'Secure LRN-based student login',
  'Historical Grade 7–9 records preserved',
];

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState('pick');
  const [role, setRole] = useState(null);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />;
  }

  const pickRole = (r) => {
    setRole(r);
    setStep('signin');
    setError('');
    setId('');
    setPassword('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!id.trim() || !password) {
      setError('Please enter your credentials.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const result = login({ role, id, password });
      if (!result.ok) {
        setSubmitting(false);
        setError(result.message);
        return;
      }
      toast.success('Welcome back!');
      navigate(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard', { replace: true });
    }, 280);
  };

  const fillDemo = () => {
    if (!role) return;
    setId(DEMO[role].id);
    setPassword(DEMO[role].password);
    setError('');
  };

  const selectedRole = ROLES.find((r) => r.key === role);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-brand-800 p-10 text-white lg:flex xl:p-14">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.06)_0%,transparent_50%)]" />

        <div className="relative">
          <div className="mb-10 flex items-center gap-3">
            <span className="icon-well-md bg-white/15 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-bold">SF10 Records</p>
              <p className="text-xs text-brand-100/80">Class Record Management</p>
            </div>
          </div>

          <h1 className="max-w-md text-3xl font-bold leading-tight xl:text-4xl">
            Academic records,<br />managed with clarity.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-100/90">
            Bagong Pag-asa National High School — a secure portal for SF10 forms, class records, and learner progress.
          </p>

          <ul className="mt-10 space-y-3">
            {FEATURES.map((text) => (
              <li key={text} className="flex items-start gap-3 text-sm text-brand-50/90">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-300" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-brand-200/70">
          <Shield className="h-3.5 w-3.5" />
          DepEd Quezon City · Schools Division Office
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <span className="icon-well-md bg-brand-700 text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">SF10 Records</p>
            <p className="text-xs text-slate-500">Bagong Pag-asa NHS</p>
          </div>
        </div>

        <div className="w-full max-w-[400px]">
          {step === 'pick' ? (
            <div className="login-step-enter">
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
                <p className="mt-2 text-sm text-slate-500">Choose your portal to continue</p>
              </div>

              <div className="space-y-3">
                {ROLES.map(({ key, label, description, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pickRole(key)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <span className="icon-well-md group-hover:bg-brand-100">
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="login-step-enter">
              <button
                type="button"
                onClick={() => { setStep('pick'); setRole(null); }}
                className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <div className="mb-6">
                {selectedRole ? (
                  <div className="mb-5 flex items-center gap-3">
                    <span className="icon-well-md">
                      <selectedRole.icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedRole.label} portal</h2>
                      <p className="text-xs text-slate-500">{selectedRole.description}</p>
                    </div>
                  </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="login-id" className="mb-1.5 block text-sm font-medium text-slate-700">
                      {role === 'student' ? 'LRN' : 'Teacher ID or Email'}
                    </label>
                    <input
                      id="login-id"
                      type="text"
                      autoComplete="username"
                      autoFocus
                      placeholder={role === 'student' ? '136045210001' : 'T-2001'}
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-sm font-semibold text-white transition-colors hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60"
                  >
                    {submitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>Continue <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={fillDemo}
                  className="mt-4 w-full rounded-xl border border-dashed border-slate-200 py-2.5 text-xs font-semibold text-slate-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  Use demo credentials
                </button>
              </div>
            </div>
          )}

          <p className="mt-10 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Bagong Pag-asa National High School
          </p>
        </div>
      </main>
    </div>
  );
}
