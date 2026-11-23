import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TRANSMUTATION_SCHOOL_YEAR } from '../../lib/transmutation.js';
import { formatComponentWeights } from '../../lib/gradeComponents.js';
import { cn } from '../../lib/utils.js';

export default function ClassRecordGuide({ gradeComponents }) {
  const [open, setOpen] = useState(false);
  const weightsText = gradeComponents
    ? formatComponentWeights(gradeComponents)
    : 'Select a subject to see component weights.';

  return (
    <div className="cr-guide-panel no-print">
      <button
        type="button"
        className="cr-guide-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex-1 text-left">
          <span className="cr-guide-toggle-title">Grading guide</span>
          <span className="cr-guide-toggle-sub">SY 2026–2027 transmutation · {weightsText}</span>
        </span>
        <ChevronDown className={cn('h-5 w-5 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="cr-guide-body">
          <div className="cr-guide-flow">
            <div className="cr-flow-step">
              <span className="cr-flow-num">1</span>
              <p>Set each assessment&apos;s total points in the top row, then enter scores such as 8 / 10. Scores cannot exceed their total points.</p>
            </div>
            <div className="cr-flow-step">
              <span className="cr-flow-num">2</span>
              <p>For each category: total earned points ÷ total possible points × 100. Apply this subject&apos;s WW / PT / EX weights, then add the weighted scores.</p>
            </div>
            <div className="cr-flow-step">
              <span className="cr-flow-num">3</span>
              <p>
                Transmutation table ({TRANSMUTATION_SCHOOL_YEAR}) converts initial → transmuted grade saved to SF10.
              </p>
            </div>
          </div>
          <p className="cr-guide-footnote">
            Initial grades from 51.34 to 69.99 are not on the official table — coordinate with your registrar if needed.
          </p>
        </div>
      ) : null}
    </div>
  );
}
