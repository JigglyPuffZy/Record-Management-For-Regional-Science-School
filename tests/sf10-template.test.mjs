import test from 'node:test';
import assert from 'node:assert/strict';
import { getSF10LearningAreas, getSF10HistorySections } from '../src/lib/sf10Template.js';
import { getGradingPeriodsForGradeLevel } from '../src/data/curriculum.js';

test('G7–9 tables include all eight reference learning areas with blank grades instead of invented zeros', () => {
  for (const grade of ['Grade 7', 'Grade 8', 'Grade 9']) {
    const rows = getSF10LearningAreas(grade, []);
    assert.deepEqual(rows.map(row => row.subjectName), ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan (AP)', 'Values Education', 'Technology and Livelihood Education (TLE)', 'MAPEH']);
    for (const row of rows) for (const field of ['quarter1', 'quarter2', 'quarter3', 'quarter4', 'finalGrade']) assert.equal(row[field], null);
    assert.deepEqual(getGradingPeriodsForGradeLevel(grade).map(period => period.label), ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4']);
  }
});

test('template rows preserve actual zero grades, stable IDs, and additional Research/legacy records', () => {
  const subjects = [{ subjectId: 'MATH', classId: 'C7', quarter1: 0, finalGrade: 75 }, { subjectId: 'RESEARCH', subjectName: 'Research', finalGrade: 89 }, { subjectId: 'ESP', subjectName: 'ESP', finalGrade: 90 }];
  const before = structuredClone(subjects);
  const rows = getSF10LearningAreas('Grade 7', subjects);
  assert.equal(rows.length, 10); assert.equal(rows.find(row => row.subjectId === 'MATH').quarter1, 0);
  assert.equal(rows.find(row => row.subjectId === 'MATH').classId, 'C7');
  assert.equal(rows.find(row => row.subjectId === 'RESEARCH').finalGrade, 89);
  assert.equal(rows.find(row => row.subjectId === 'ESP').finalGrade, 90);
  assert.deepEqual(subjects, before);
  assert.equal(getSF10LearningAreas('Grade 10', subjects), subjects);
  assert.deepEqual(getGradingPeriodsForGradeLevel('Grade 10').map(period => period.label), ['Term 1', 'Term 2', 'Term 3']);
});

test('Grade 10 SF10 gets blank G7–9 sections without creating years or replacing repeated-grade history', () => {
  const empty = getSF10HistorySections([], 'Grade 10');
  assert.deepEqual(empty.map(row => row.gradeLevel), ['Grade 7', 'Grade 8', 'Grade 9']);
  assert.ok(empty.every(row => row.schoolYear === '' && row.isPlaceholder && !row.subjects.length));
  const history = [{ gradeLevel: 'Grade 7', schoolYear: '2023-2024', subjects: [{ subjectId: 'MATH', finalGrade: 90 }] }, { gradeLevel: 'Grade 7', schoolYear: '2024-2025', subjects: [] }];
  const sections = getSF10HistorySections(history, 'Grade 10');
  assert.equal(sections.length, 4); assert.equal(sections[0], history[0]); assert.equal(sections[1], history[1]);
  assert.equal(history.length, 2);
  assert.deepEqual(getSF10HistorySections([], 'Grade 7'), []);
  assert.deepEqual(getSF10HistorySections([], 'Grade 8').map(row => row.gradeLevel), ['Grade 7']);
});
