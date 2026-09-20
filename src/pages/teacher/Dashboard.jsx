import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, School, BookOpen, ClipboardList, GraduationCap,
  ArrowUpRight, AlertCircle,
} from 'lucide-react';
import PageContainer, { BentoTile } from '../../components/layout/PageContainer.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getTeacherDashboardSummary, getClassLabel, subscribeToGrades } from '../../services/academicRecords.js';
import { getStudentsByClass as getRoster } from '../../data/students.js';
import { initials } from '../../lib/utils.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(() => getTeacherDashboardSummary(user.id));

  useEffect(() => subscribeToGrades(() => setSummary(getTeacherDashboardSummary(user.id))), [user.id]);

  if (!summary) return null;

  const hasPending = summary.pendingRecords > 0;

  return (
    <PageContainer wide>
      <div className="page-enter grid auto-rows-auto grid-cols-6 gap-3 sm:gap-4">
        <BentoTile className="col-span-6 border-l-4 border-l-brand-700 sm:col-span-4">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{greeting()}</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{summary.teacher.name}</h1>
              <p className="mt-2 text-sm text-slate-500">
                {summary.teacher.position} · SY {summary.schoolYear}
              </p>
              <div className="mt-4">
                {hasPending ? (
                  <Badge tone="amber" dot>{summary.pendingRecords} records need attention</Badge>
                ) : (
                  <Badge tone="emerald" dot>All caught up</Badge>
                )}
              </div>
            </div>
            <span className="avatar-well h-16 w-16 flex-shrink-0 self-start text-xl sm:self-center">
              {initials(summary.teacher.name)}
            </span>
          </div>
        </BentoTile>

        <BentoTile
          as="link"
          to="/teacher/class-record"
          className="col-span-6 flex flex-col justify-between bg-brand-700 text-white hover:border-brand-600 sm:col-span-2"
        >
          <div>
            <span className="icon-well-sm bg-white/15 text-white">
              <ClipboardList className="h-4 w-4" />
            </span>
            <p className="mt-4 text-lg font-bold">Enter Grades</p>
            <p className="mt-1 text-xs text-brand-100">Class Record editor</p>
          </div>
          <span className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-brand-50">
            Open editor <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </BentoTile>

        <BentoTile className="col-span-2 sm:col-span-2">
          <span className="icon-well-sm">
            <Users className="h-4 w-4" />
          </span>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.totalStudents}</p>
          <p className="text-xs font-medium text-slate-500">Students</p>
        </BentoTile>

        <BentoTile className="col-span-2 sm:col-span-2">
          <span className="icon-well-sm">
            <School className="h-4 w-4" />
          </span>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.classes.length}</p>
          <p className="text-xs font-medium text-slate-500">Classes</p>
        </BentoTile>

        <BentoTile className="col-span-2 sm:col-span-2">
          <span className="icon-well-sm">
            <BookOpen className="h-4 w-4" />
          </span>
          <p className="mt-3 text-3xl font-bold text-slate-900">{summary.subjectNames.length}</p>
          <p className="text-xs font-medium text-slate-500">Subjects</p>
        </BentoTile>

        <BentoTile as="link" to="/teacher/students" className="col-span-3 sm:col-span-2">
          <span className="icon-well-sm">
            <Users className="h-4 w-4" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900">Find Student</p>
          <p className="text-xs text-slate-500">Search roster</p>
        </BentoTile>

        <BentoTile as="link" to="/teacher/academic-records" className="col-span-3 sm:col-span-2">
          <span className="icon-well-sm">
            <GraduationCap className="h-4 w-4" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900">View SF10</p>
          <p className="text-xs text-slate-500">Learner records</p>
        </BentoTile>

        <BentoTile as="link" to="/teacher/classes" className="col-span-6 sm:col-span-2">
          <span className="icon-well-sm">
            <School className="h-4 w-4" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900">All Classes</p>
          <p className="text-xs text-slate-500">{summary.classes.length} sections</p>
        </BentoTile>

        {hasPending ? (
          <BentoTile
            as="link"
            to="/teacher/class-record"
            className="col-span-6 flex items-center gap-4 border-amber-200 bg-amber-50"
          >
            <span className="icon-well-md bg-amber-100 text-amber-700">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">{summary.pendingRecords} class records incomplete</p>
              <p className="text-xs text-amber-700">Some students are missing term grades — tap to continue</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-amber-600" />
          </BentoTile>
        ) : null}

        <div className="col-span-6 bento-tile">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Your Classes</h2>
            <Link to="/teacher/classes" className="text-xs font-semibold text-brand-700">View all →</Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.classes.map((cls) => (
              <Link
                key={cls.id}
                to={`/teacher/classes/${cls.id}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 transition-all hover:border-brand-200 hover:bg-white hover:shadow-sm"
              >
                <span className="icon-well-sm bg-white">
                  <School className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{getClassLabel(cls.id)}</p>
                  <p className="text-xs text-slate-500">
                    {getRoster(cls.id).length} students
                    {cls.adviserId === user.id ? ' · Adviser' : ''}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-slate-300 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Subjects handled</p>
            <div className="flex flex-wrap gap-1.5">
              {summary.subjectNames.map((name) => (
                <Badge key={name} tone="brand">{name}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
