import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyScoreSet, categoryPercentage, computeInitialGrade,
  collectInvalidScoreCells, loadSheetTotalPoints, saveSheetTotalPoints,
  sheetStorageKey, saveSheetScores, loadSheetScores,
} from '../src/lib/classRecordSheet.js';
import { transmuteInitialGrade } from '../src/lib/transmutation.js';

function filled(values) {
  const result = createEmptyScoreSet();
  for (const [category, entries] of Object.entries(values)) entries.forEach((value, index) => { result[category][index] = String(value); });
  return result;
}

test('raw score / total points flows through weighting and the existing SF10 transmutation', () => {
  const scores = filled({ ww: [8], pt: [45], qa: [30] });
  const totals = filled({ ww: [10], pt: [50], qa: [40] });
  const initial = computeInitialGrade(scores, undefined, totals);
  assert.equal(initial, 83.5); // 80% * 20% + 90% * 50% + 75% * 30%
  assert.equal(transmuteInitialGrade(initial), 86);
});
test('assessments with different maxima use pooled earned/possible points', () => {
  assert.equal(categoryPercentage(['8', '18'], ['10', '30']), 65);
  assert.equal(computeInitialGrade(filled({ ww: [8, 18], pt: [45], qa: [30] }), undefined, filled({ ww: [10, 30], pt: [50], qa: [40] })), 80.5);
});
test('raw scores can exceed 100 when their maximum allows it', () => {
  assert.equal(categoryPercentage(['150'], ['200']), 75);
  assert.equal(collectInvalidScoreCells({ learner: filled({ ww: [150] }) }, filled({ ww: [200] })).size, 0);
});
test('blank assessments are ungraded, while a scored zero counts toward possible points', () => {
  assert.equal(categoryPercentage(['8', ''], ['10', '20']), 80);
  assert.equal(categoryPercentage(['8', '0'], ['10', '10']), 40);
  assert.equal(computeInitialGrade(createEmptyScoreSet(), undefined, createEmptyScoreSet()), null);
});
test('invalid scores/maxima prevent a computed or transmuted grade', () => {
  for (const [score, maximum] of [['11', '10'], ['-1', '10'], ['8', '0'], ['8', '-10'], ['8', ''], ['8', 'Infinity'], ['abc', '10'], ['Infinity', '10']]) {
    const scores = filled({ ww: [score], pt: [10] });
    const totals = filled({ ww: [maximum], pt: [10] });
    assert.equal(computeInitialGrade(scores, undefined, totals), null, `${score}/${maximum}`);
    assert.ok(collectInvalidScoreCells({ learner: scores }, totals).has('learner:ww:0'));
  }
  assert.equal(categoryPercentage(['8'], []), null);
});
test('subject-specific weights remain intact and round only the final initial grade', () => {
  assert.equal(computeInitialGrade(filled({ ww: [8], pt: [45], qa: [30] }), { ww: 0.2, pt: 0.6, ex: 0.2 }, filled({ ww: [10], pt: [50], qa: [40] })), 85);
  assert.ok(Math.abs(categoryPercentage(['1'], ['3']) - 100 / 3) < 1e-12);
});
test('legacy percentage callers retain their existing computation', () => {
  assert.equal(computeInitialGrade(filled({ ww: [80], pt: [90], qa: [75] })), 83.5);
});
test('legacy draft columns migrate to /100; explicit totals survive reload and stay scoped to the sheet', () => {
  const stored = new Map();
  globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
  try {
    const key = sheetStorageKey({ classId: 'CLASS-A', subjectId: 'MATH', schoolYear: '2026-2027', periodId: 'term1' });
    const legacy = { learner: filled({ ww: [80], pt: [90] }) };
    saveSheetScores(key, legacy);
    const migrated = loadSheetTotalPoints(key, loadSheetScores(key));
    assert.equal(migrated.ww[0], '100'); assert.equal(migrated.ww[1], '');
    const totals = filled({ ww: [10], pt: [50] });
    saveSheetTotalPoints(key, totals);
    assert.deepEqual(loadSheetTotalPoints(key, legacy), totals);
    assert.deepEqual(loadSheetTotalPoints(key + '-other-period'), createEmptyScoreSet());
    // Saving an explicit blank maximum must not revert to /100 on refresh.
    saveSheetTotalPoints(key, createEmptyScoreSet());
    assert.equal(loadSheetTotalPoints(key, legacy).ww[0], '');
    assert.deepEqual(loadSheetScores(key), legacy);
  } finally { delete globalThis.localStorage; }
});
