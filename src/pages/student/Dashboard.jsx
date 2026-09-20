import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, TrendingUp, FileText, UserCircle, ArrowUpRight } from 'lucide-react';
import PageContainer, { BentoTile } from '../../components/layout/PageContainer.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Table, THead, TBody, Th, Td } from '../../components/ui/Table.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getStudentDashboardSummary, getCurrentYearGrades, subscribeToGrades } from '../../services/academicRecords.js';
import { formatGrade, initials } from '../../lib/utils.js';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(() => getStudentDashboardSummary(user.id));
  const [subjects, setSubjects] = useState(() => getCurrentYearGrades(user.id));

  useEffect(() => {
    const refresh = () => {
      setSummary(getStudentDashboardSummary(user.id));
      setSubjects(getCurrentYearGrades(user.id));
    };
    return subscribeToGrades(refresh);
  }, [user.id]);

  if (!summary) return null;

  const gradedCount = subjects.filter((s) => s.finalGrade !== null).length;
  const avg = summary.generalAverage;
  const periods = subjects[0]?.gradingPeriods ?? [];
  const isGrade10 = summary.gradeLevel === 'Grade 10';

  return (
    <PageContainer wide>
      <div className="page-enter grid auto-rows-auto grid-cols-6 gap-3 sm:gap-4">
        <BentoTile className="col-span-6 border-l-4 border-l-brand-700 sm:col-span-4 lg:col-span-4">
          <div className="flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Your workspace</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                Hi, {summary.student.firstName}!
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {summary.classLabel} · SY {summary.schoolYear}
              </p>
              <div className="mt-4">
                <Badge tone="emerald" dot>{summary.status}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">General Average</p>
                <p className="text-4xl font-bold tabular-nums text-slate-900">{formatGrade(avg)}</p>
              </div>
              <span className="avatar-well h-16 w-16 text-xl">
                {initials(summary.student.name)}
              </span>
            </div>
          </div>
        </BentoTile>

        <BentoTile as="link" to="/student/sf10" className="col-span-3 flex flex-col justify-between bg-brand-700 text-white hover:border-brand-600 sm:col-span-2 lg:col-span-2">
          <div>
            <span className="icon-well-sm bg-white/15 text-white">
              <FileText className="h-4 w-4" />
            </span>
            <p className="mt-4 text-lg font-bold">My SF10</p>
            <p className="mt-1 text-xs text-brand-100">Permanent academic record</p>
          </div>
          <span className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-brand-50">
            Open <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </BentoTile>

        <BentoTile className="col-span-2 sm:col-span-2 lg:col-span-2">
          <span className="icon-well-sm">
            <TrendingUp className="h-4 w-4" />
          </span>
          <p className="mt-3 text-2xl font-bold text-slate-900">{summary.subjectCount}</p>
          <p className="text-xs font-medium text-slate-500">Subjects enrolled</p>
          <p className="mt-1 text-[11px] text-brand-700">{gradedCount} graded</p>
        </BentoTile>

        <BentoTile as="link" to="/student/academic-records" className="col-span-2 sm:col-span-2 lg:col-span-2">
          <span className="icon-well-sm">
            <BookOpen className="h-4 w-4" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900">Academic Records</p>
          <p className="mt-1 text-xs text-slate-500">Filter by year & period</p>
          <ArrowUpRight className="mt-4 h-4 w-4 text-slate-300" />
        </BentoTile>

        <BentoTile as="link" to="/student/profile" className="col-span-2 sm:col-span-2 lg:col-span-2">
          <span className="icon-well-sm">
            <UserCircle className="h-4 w-4" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900">My Profile</p>
          <p className="mt-1 text-xs text-slate-500">{summary.student.studentId}</p>
          <ArrowUpRight className="mt-4 h-4 w-4 text-slate-300" />
        </BentoTile>

        <div className="col-span-6 bento-tile !p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Grade Board</h2>
              <p className="text-xs text-slate-500">Updates when teachers save grades</p>
            </div>
            <Link to="/student/sf10" className="text-xs font-semibold text-brand-700 hover:text-brand-600">
              Full SF10 →
            </Link>
          </div>
          <div className="overflow-x-auto p-2 sm:p-3">
            <Table>
              <THead>
                <tr>
                  <Th>Subject</Th>
                  <Th>Teacher</Th>
                  {periods.map((p) => (
                    <Th key={p.id} align="right">{p.label}</Th>
                  ))}
                  <Th align="right">Final Rating</Th>
                  {isGrade10 ? <Th>Descriptor</Th> : null}
                </tr>
              </THead>
              <TBody>
                {subjects.map((s) => (
                  <tr key={s.subjectId}>
                    <Td className="font-semibold text-slate-900">{s.subjectName}</Td>
                    <Td className="text-slate-500">{s.teacherName}</Td>
                    {periods.map((p) => (
                      <Td key={p.id} align="right" className="tabular-nums">{formatGrade(s[p.field])}</Td>
                    ))}
                    <Td align="right" className="font-semibold tabular-nums">
                      {s.finalGrade !== null ? s.finalGrade : <Badge tone="amber">—</Badge>}
                    </Td>
                    {isGrade10 ? (
                      <Td className="text-sm text-slate-600">
                        {s.descriptor ? (
                          <>
                            {s.descriptor}
                            {s.filipinoDescriptor ? <span className="block text-xs text-slate-500">({s.filipinoDescriptor})</span> : null}
                          </>
                        ) : '—'}
                      </Td>
                    ) : null}
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
