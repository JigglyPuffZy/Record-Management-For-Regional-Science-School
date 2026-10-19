import { cn } from '../../lib/utils.js';

export default function ScoreCell({ value, onChange, invalid, disabled, ariaLabel }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="—"
      className={cn(
        'cr-score-cell',
        invalid && 'cr-score-cell--invalid',
        disabled && 'cr-score-cell--disabled',
      )}
    />
  );
}
