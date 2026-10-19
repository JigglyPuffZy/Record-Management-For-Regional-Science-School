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
      <StatCard label="Enrolled" value={total} icon={Users} tone="slate" hint="Students in this class" />
      <StatCard label="Saved for this term" value={`${graded}/${total}`} icon={CheckCircle2} tone="emerald" hint="Term grades posted" />
      <StatCard label="Not yet saved" value={total - graded} icon={Clock} tone="amber" hint="Still need a term grade" />
      <StatCard label="Class average" value={average ?? '—'} icon={TrendingUp} tone="brand" hint="Based on saved term grades" />
    </div>
  );
}
