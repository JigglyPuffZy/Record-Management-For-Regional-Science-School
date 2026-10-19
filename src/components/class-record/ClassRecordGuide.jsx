import { Info } from 'lucide-react';
import { TRANSMUTATION_SCHOOL_YEAR } from '../../lib/transmutation.js';
import { formatComponentWeights } from '../../lib/gradeComponents.js';

const STEPS = [
  'Enter scores from 0 to 100 in Written Works, Performance Tasks, and Examinations.',
  'The system computes the initial grade using your subject’s WW / PT / EX weights.',
  'The initial grade is converted using the new transmutation table — that transmuted score is saved to the SF10.',
];

export default function ClassRecordGuide({ gradeComponents }) {
  const weightsText = gradeComponents ? formatComponentWeights(gradeComponents) : 'Weights depend on the subject selected above.';

  return (
    <aside className="cr-guide no-print" aria-label="How to use the class record">
      <div className="cr-guide-head">
        <span className="cr-guide-icon" aria-hidden="true">
          <Info className="h-5 w-5" />
        </span>
        <div>
          <h3 className="cr-guide-title">How grading works (SY 2026–2027)</h3>
          <p className="cr-guide-lead">
            Step 1: weighted initial grade from component scores. Step 2: transmutation table. Step 3: save transmuted grade.
          </p>
        </div>
      </div>

      <ol className="cr-guide-steps">
        {STEPS.map((step, i) => (
          <li key={i}>
            <span className="cr-guide-step-num">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="cr-guide-legend">
        <p className="cr-guide-legend-title">Subject weights (this class record)</p>
        <p className="cr-guide-weights-line">{weightsText}</p>
        <p className="cr-guide-legend-title mt-4">Typical subjects</p>
        <ul className="cr-guide-legend-list cr-guide-legend-list--compact">
          <li>Math, Science, English, Filipino, AP, ESP, TLE, Research: WW 20% · PT 50% · EX 30%</li>
          <li>MAPEH, Music &amp; Arts, PE &amp; Health, Creative Tech: WW 20% · PT 60% · EX 20%</li>
        </ul>
      </div>

      <p className="cr-guide-formula">
        <strong>Initial grade</strong> = (WW% × WW average) + (PT% × PT average) + (EX% × EX average).
        <br />
        <strong>Transmutation ({TRANSMUTATION_SCHOOL_YEAR}):</strong> lookup initial grade in the official table → transmuted grade (60–100).
      </p>
    </aside>
  );
}
