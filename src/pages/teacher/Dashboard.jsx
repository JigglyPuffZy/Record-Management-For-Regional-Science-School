import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  School,
  BookOpen,
  ClipboardList,
  GraduationCap,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Search,
  Plus,
} from 'lucide-react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import AppLogo from '../../components/ui/AppLogo.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getTeacherDashboardSummary,
  getClassLabel,
  getTeachingAssignments,
  subscribeToGrades,
} from '../../services/academicRecords.js';
import { getStudentsByClass as getRoster } from '../../data/students.js';
import { initials, cn } from '../../lib/utils.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatToday() {
  return new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const QUICK_LINKS = [
  { to: '/teacher/students', label: 'Student roster', hint: 'Search & manage', icon: Search },
  { to: '/teacher/academic-records', label: 'SF10 records', hint: 'View learner forms', icon: GraduationCap },
  { to: '/teacher/students/create', label: 'Enroll student', hint: 'Create account', icon: Plus },
  { to: '/teacher/classes', label: 'All sections', hint: 'Class overview', icon: School },
];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(() => getTeacherDashboardSummary(user.id));

  useEffect(() => subscribeToGrades(() => setSummary(getTeacherDashboardSummary(user.id))), [user.id]);

  if (!summary) return null;

  const assignments = getTeachingAssignments(user.id);
  const totalAssignments = assignments.length;
  const completeAssignments = Math.max(0, totalAssignments - summary.pendingRecords);
  const completionPct = totalAssignments
    ? Math.round((completeAssignments / totalAssignments) * 100)
    : 100;
  const hasPending = summary.pendingRecords > 0;

  return (
    <PageContainer wide className="dash-workspace">
      <section className="dash-hero">
        <div className="dash-hero-pattern" aria-hidden="true" />
        <div className="dash-hero-inner">
          <div className="dash-hero-copy">
            <div className="dash-hero-brand">
              <AppLogo className="h-9 w-9" />
              <div>
                <p className="dash-hero-eyebrow">{greeting()}</p>
                <p className="dash-hero-date">{formatToday()}</p>
              </div>
            </div>
            <h1 className="dash-hero-title">{summary.teacher.name}</h1>
            <p className="dash-hero-meta">
              {summary.teacher.position} · School Year {summary.schoolYear}
            </p>
          </div>

          <div className="dash-hero-side">
            <span className="dash-hero-avatar">{initials(summary.teacher.name)}</span>
            <div className="dash-hero-stats">
              <div className="dash-hero-stat">
                <Users className="h-4 w-4" />
                <span><strong>{summary.totalStudents}</strong> students</span>
              </div>
              <div className="dash-hero-stat">
                <School className="h-4 w-4" />
                <span><strong>{summary.classes.length}</strong> classes</span>
              </div>
              <div className="dash-hero-stat">
                <BookOpen className="h-4 w-4" />
                <span><strong>{summary.subjectNames.length}</strong> subjects</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="dash-body">
        <div className="dash-main">
          <div className="dash-focus-card">
            <div className="dash-focus-head">
              <div>
                <p className="dash-section-label">Primary workspace</p>
                <h2 className="dash-focus-title">Class Record</h2>
                <p className="dash-focus-desc">
                  Enter and save term grades — updates sync to each student&apos;s SF10.
                </p>
              </div>
              <div className="dash-progress-ring" style={{ '--pct': completionPct }}>
                <svg viewBox="0 0 36 36" aria-hidden="true">
                  <circle className="dash-progress-track" cx="18" cy="18" r="15.5" />
                  <circle className="dash-progress-fill" cx="18" cy="18" r="15.5" />
                </svg>
                <span className="dash-progress-value">{completionPct}%</span>
                <span className="dash-progress-caption">complete</span>
              </div>
            </div>

            {hasPending ? (
              <Link to="/teacher/class-record" className="dash-alert">
                <span className="dash-alert-icon">
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="dash-alert-title">{summary.pendingRecords} records need grading</p>
                  <p className="dash-alert-text">Some class-subject sheets still have missing term grades.</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </Link>
            ) : (
              <div className="dash-clear">
                <CheckCircle2 className="h-5 w-5" />
                <p>All class records are up to date for this school year.</p>
              </div>
            )}

            <Link to="/teacher/class-record" className="dash-primary-cta">
              <ClipboardList className="h-5 w-5" />
              Open Class Record editor
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <section className="dash-classes">
            <div className="dash-classes-head">
              <div>
                <p className="dash-section-label">Your sections</p>
                <h2 className="dash-section-title">Classes &amp; rosters</h2>
              </div>
              <Link to="/teacher/classes" className="dash-text-link">View all</Link>
            </div>

            <div className="dash-class-list">
              {summary.classes.map((cls) => {
                const rosterCount = getRoster(cls.id).length;
                const isAdviser = cls.adviserId === user.id;
                return (
                  <Link key={cls.id} to={`/teacher/classes/${cls.id}`} className="dash-class-row">
                    <span className="dash-class-icon">
                      <School className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="dash-class-name">{getClassLabel(cls.id)}</p>
                      <p className="dash-class-meta">
                        {rosterCount} student{rosterCount === 1 ? '' : 's'}
                        {isAdviser ? ' · Class adviser' : ''}
                      </p>
                    </div>
                    <span className="dash-class-chevron" aria-hidden="true">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                );
              })}
            </div>

            {summary.subjectNames.length ? (
              <div className="dash-subjects">
                <p className="dash-subjects-label">Subjects you handle</p>
                <div className="dash-subject-tags">
                  {summary.subjectNames.map((name) => (
                    <Badge key={name} tone="brand">{name}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="dash-sidebar">
          <p className="dash-section-label">Quick access</p>
          <nav className="dash-quick-nav">
            {QUICK_LINKS.map(({ to, label, hint, icon: Icon }) => (
              <Link key={to} to={to} className="dash-quick-item">
                <span className="dash-quick-icon">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="dash-quick-label">{label}</p>
                  <p className="dash-quick-hint">{hint}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))}
          </nav>

          <div className="dash-status-card">
            <p className="dash-status-label">Grading status</p>
            <div className="dash-status-rows">
              <div className="dash-status-row">
                <span>Complete</span>
                <strong className="text-brand-700">{completeAssignments}</strong>
              </div>
              <div className="dash-status-row">
                <span>Pending</span>
                <strong className={cn(hasPending ? 'text-amber-600' : 'text-slate-400')}>
                  {summary.pendingRecords}
                </strong>
              </div>
              <div className="dash-status-row">
                <span>Total sheets</span>
                <strong>{totalAssignments}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
