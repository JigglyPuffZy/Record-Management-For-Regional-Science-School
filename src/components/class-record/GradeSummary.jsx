import { Users, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import { StatCard } from '../ui/Card.jsx';
import { computeAverage } from '../../lib/utils.js';

export default function GradeSummary({ rows, activePeriod, periods }) {
  const total = rows.length;
  const activeField = periods.find((p) => p.id === activePeriod)?.field;
  const graded = rows.filter((r) => r[activeField] !== null && r[activeField] !== undefined).length;
  const average = computeAverage(rows.map((r) => r[activeField]));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Students" value={total} icon={Users} tone="slate" />
      <StatCard label="Graded" value={`${graded}/${total}`} icon={CheckCircle2} tone="emerald" />
      <StatCard label="Pending" value={total - graded} icon={Clock} tone="amber" />
      <StatCard label="Class Average" value={average ?? '—'} icon={TrendingUp} tone="brand" />
    </div>
  );
}
