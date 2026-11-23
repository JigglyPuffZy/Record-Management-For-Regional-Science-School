import { cn } from '../../lib/utils.js';

export default function ScoreCell({ value, onChange, invalid, disabled, ariaLabel, totalPoints }) {
  return (
    <div className={totalPoints !== undefined ? 'cr-score-fraction' : undefined}>
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={value ?? ''}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      title={totalPoints !== undefined ? `Score / ${totalPoints || 'total points not set'}` : undefined}
      onChange={(e) => onChange(e.target.value)}
      placeholder="—"
      className={cn(
        'cr-score-cell',
        invalid && 'cr-score-cell--invalid',
        disabled && 'cr-score-cell--disabled',
      )}
    />
    {totalPoints !== undefined && <span className="cr-score-denominator" aria-hidden="true">/ {totalPoints || '—'}</span>}
    </div>
  );
}
