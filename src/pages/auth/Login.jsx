import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  UserRound,
  Users,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import AppLogo from '../../components/ui/AppLogo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';
import { SCHOOL } from '../../data/schools.js';
import { dashboardFor } from '../../lib/api.js';

const ROLES = [
  { key: 'admin', label: 'Admin', icon: ShieldCheck },
  { key: 'student', label: 'Student', icon: UserRound },
  { key: 'teacher', label: 'Teacher', icon: Users },
];

function Barcode() {
  return (
    <div className="login-ticket-barcode" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} style={{ height: `${38 + (i % 5) * 8}%` }} />
      ))}
    </div>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState('teacher');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={dashboardFor(user.role)} replace />;
  }

  const switchRole = (next) => {
    setRole(next);
    setError('');
    setId('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!id.trim() || !password) {
      setError('Please enter your ID and password.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await login({ role, id, password });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast.success('Welcome back!');
      navigate(dashboardFor(result.role), { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-ticket-page">
      <div className="login-ticket-bg" aria-hidden="true" />

      <div className="login-ticket-enter login-ticket-shell">
        <article className="login-ticket">
          <div className="login-ticket-notch login-ticket-notch--tl" aria-hidden="true" />
          <div className="login-ticket-notch login-ticket-notch--tr" aria-hidden="true" />
          <div className="login-ticket-notch login-ticket-notch--bl" aria-hidden="true" />
          <div className="login-ticket-notch login-ticket-notch--br" aria-hidden="true" />

          <div className="login-ticket-stub">
            <div className="login-ticket-stub-inner">
              <span className="login-ticket-stamp">Portal Access</span>

              <div className="login-ticket-brand">
                <span className="login-ticket-logo">
                  <AppLogo className="h-16 w-16" />
                </span>
                <div>
                  <p className="login-ticket-school">{SCHOOL.name}</p>
                  <p className="login-ticket-division">School Records Portal</p>
                </div>
              </div>

              <div className="login-ticket-meta">
                <div>
                  <p className="login-ticket-meta-label">School Year</p>
                  <p className="login-ticket-meta-value">2026–2027</p>
                </div>
                <div>
                  <p className="login-ticket-meta-label">Grade Level</p>
                  <p className="login-ticket-meta-value">10 · Rizal</p>
                </div>
              </div>

              <Barcode />

              <p className="login-ticket-footnote">
                SF10 &amp; Class Record Management
                <br />
                Regional Science High School for Region II
              </p>
            </div>
          </div>

          <div className="login-ticket-tear" aria-hidden="true">
            <span className="login-ticket-tear-dot" />
            <span className="login-ticket-tear-dot" />
            <span className="login-ticket-tear-dot" />
            <span className="login-ticket-tear-dot" />
            <span className="login-ticket-tear-dot" />
          </div>

          <div className="login-ticket-main">
            <header className="login-ticket-head">
              <h1 className="login-ticket-title">Sign in</h1>
              <p className="login-ticket-sub">Enter your credentials to open the portal.</p>
            </header>

            <div className="login-ticket-roles" role="tablist" aria-label="Sign in as">
              {ROLES.map(({ key, label, icon: Icon }) => {
                const active = role === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchRole(key)}
                    className={cn('login-ticket-role', active && 'login-ticket-role--on')}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="login-ticket-form">
              <label className="login-ticket-field">
                <span className="login-ticket-label">
                  {role === 'student' ? 'LRN / Email' : role === 'admin' ? 'Admin ID / Email' : 'Teacher ID / Email'}
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder={role === 'student' ? '12-digit learner number' : role === 'admin' ? 'Admin ID or email' : 'Teacher ID or school email'}
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="login-ticket-input"
                />
              </label>

              <label className="login-ticket-field">
                <span className="login-ticket-label">Password</span>
                <div className="login-ticket-pass-row">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-ticket-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="login-ticket-eye"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error ? (
                <p className="login-ticket-error" role="alert">{error}</p>
              ) : null}

              <button type="submit" disabled={submitting} className="login-ticket-btn group">
                {submitting ? (
                  <span className="login-ticket-spinner" />
                ) : (
                  <>
                    Enter portal
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-600">New teacher or student? <Link to="/register" className="font-semibold text-brand-700 underline">Register for approval</Link></p>
          </div>
        </article>
      </div>
    </div>
  );
}
