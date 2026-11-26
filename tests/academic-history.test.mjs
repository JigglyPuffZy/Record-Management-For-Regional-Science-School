import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAcademicHistory } from '../src/data/academicHistory.js';
import { getDescriptorForGradeLevel } from '../src/lib/grading.js';
import { validateWorkflow } from '../api/_lib/academic-workflows.js';
import { SUBJECTS } from '../src/data/subjects.js';

const archive = (id, student, year, level) => ({ id, student_id: student, school_year_id: year, grade_level: level, school_name: 'Original school', section: 'A' });
const grade = (year, level, value) => ({ studentId: 'S1', schoolYear: year, gradeLevel: level, classId: `C${level}`, subjectId: 'MATH', quarter1: value, quarter2: value, quarter3: value, quarter4: level === 'Grade 10' ? null : value, finalGrade: value });

test('requested learning areas are available without removing legacy ESP or Research', () => {
  const names = SUBJECTS.map(subject => subject.name);
  for (const name of ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan (AP)', 'Values Education', 'Technology and Livelihood Education (TLE)', 'MAPEH']) assert.ok(names.includes(name));
  assert.equal(new Set(SUBJECTS.map(subject => subject.id)).size, SUBJECTS.length);
  assert.ok(SUBJECTS.some(subject => subject.id === 'ESP'));
  assert.ok(SUBJECTS.some(subject => subject.id === 'RESEARCH'));
});

test('history orders G7–G10, retains snapshot identity, and applies canonical corrections', () => {
  const result = buildAcademicHistory({
    grades: [grade('2026-2027', 'Grade 10', 90), grade('2023-2024', 'Grade 7', 88)],
    classes: [], teachers: [], subjects: [{ id: 'MATH', name: 'Mathematics' }],
    archives: [archive('Y9', 'S1', '2025-2026', 'Grade 9'), archive('Y7', 'S1', '2023-2024', 'Grade 7'), archive('Y8', 'S1', '2024-2025', 'Grade 8')],
    archivedGrades: [{ academic_year_record_id: 'Y7', subject_id: 'MATH', subject_name: 'Mathematics', final_grade: 80 }, { academic_year_record_id: 'Y9', subject_id: 'MATH', subject_name: 'Mathematics', final_grade: 74 }],
  });
  assert.deepEqual(result.map(year => year.gradeLevel), ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']);
  assert.equal(result[0].school, 'Original school');
  assert.equal(result[0].subjects[0].finalGrade, 88);
  assert.equal(result[0].subjects[0].remarks, 'Passed');
  assert.equal(result[2].subjects[0].remarks, 'Failed');
  assert.equal(result[3].gradingPeriods.length, 3);
  assert.equal(result[3].subjects[0].remarks, 'Advancing');
  assert.equal(result[1].generalAverage, null);
});

test('unfinished grades never create a partial general average; repeated grades preserve both years', () => {
  const result = buildAcademicHistory({ grades: [grade('2023-2024', 'Grade 7', 90), { ...grade('2023-2024', 'Grade 7', null), subjectId: 'SCI' }, grade('2024-2025', 'Grade 7', 85)], classes: [], teachers: [], subjects: [] });
  assert.equal(result.length, 2);
  assert.equal(result[0].generalAverage, null);
  assert.equal(result[1].generalAverage, 85);
});

test('approved G10 scale covers every boundary and decimal without adding a fourth term', () => {
  for (const [value, expected] of [[0, 'Emerging'], [64.9, 'Emerging'], [65, 'Developing'], [74.9, 'Developing'], [75, 'Connecting'], [79.9, 'Connecting'], [80, 'Benchmarking'], [89.9, 'Benchmarking'], [90, 'Advancing'], [100, 'Advancing']]) {
    const result = getDescriptorForGradeLevel('Grade 10', value);
    assert.equal(result.descriptor, expected); assert.equal(result.remarks, expected);
  }
  assert.equal(getDescriptorForGradeLevel('Grade 10', null).remarks, '');
});

test('workflow validation ignores forged identities, rejects invalid values, and preserves unverified eligibility', () => {
  const result = validateWorkflow('eligibility', { reason: 'Verified paper record', studentId: 'S1', actorId: 'forged', details: { generalAverage: '', eligible: 'true', role: 'admin' } });
  assert.equal(result.actorId, undefined); assert.equal(result.details.role, undefined);
  assert.equal(result.details.generalAverage, null); assert.equal(result.details.eligible, null);
  for (const details of [{ generalAverage: 101 }, { assessmentDate: '2026-02-30' }]) assert.throws(() => validateWorkflow('eligibility', { reason: 'verified', studentId: 'S1', details }));
  for (const schoolYear of ['2027-2029', '2027', 'wrong']) assert.throws(() => validateWorkflow('year', { reason: 'verified', schoolYear }));
  assert.throws(() => validateWorkflow('correct-history', { studentId: 'S1', reason: '' }));
  assert.throws(() => validateWorkflow('correct-history', { studentId: 'S1', reason: 'verified', grades: { quarter1: '90' } }));
  assert.deepEqual(validateWorkflow('advance', { reason: 'Registrar confirmed', outcome: 'promote', targetClassId: 'C8', studentIds: ['S1', 'S1'] }).studentIds, ['S1']);
});

test('inline SF10 details validate identity and eligibility while ignoring forged enrollment and account fields', () => {
  const input = {
    studentId: 'S1', reason: 'Verified enrollment form',
    learner: { firstName: ' Test ', lastName: ' Learner ', middleName: '', nameExtension: 'Jr.', lrn: '123456789012', birthdate: '2011-01-01', sex: 'Male', role: 'admin', status: 'Graduated', studentId: 'other' },
    details: { generalAverage: '92.5', eligible: true },
    expected: { learnerUpdatedAt: '2026-11-26T00:00:00Z', eligibilityUpdatedAt: null },
  };
  const result = validateWorkflow('sf10-details', input);
  assert.equal(result.learner.firstName, 'Test'); assert.equal(result.learner.lastName, 'Learner');
  assert.equal(result.learner.status, undefined); assert.equal(result.learner.role, undefined); assert.equal(result.learner.studentId, undefined);
  assert.equal(result.details.generalAverage, 92.5); assert.equal(result.details.eligible, true);
  for (const patch of [{ lrn: '123' }, { firstName: '' }, { birthdate: '2011-02-30' }, { birthdate: '9999-01-01' }, { sex: 'Invalid' }]) {
    assert.throws(() => validateWorkflow('sf10-details', { ...input, learner: { ...input.learner, ...patch } }));
  }
  assert.throws(() => validateWorkflow('sf10-details', { ...input, expected: {} }));
  assert.throws(() => validateWorkflow('sf10-details', { ...input, details: { generalAverage: 101 } }));
});
