import { HttpError } from './access.js';

const text = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function validateWorkflow(action, input = {}) {
  if (action === 'sf10-details') {
    const data = validateWorkflow('eligibility', input);
    data.learner = {};
    for (const field of ['firstName', 'lastName', 'middleName', 'nameExtension', 'lrn', 'birthdate', 'sex']) data.learner[field] = text(input.learner?.[field]);
    if (!data.learner.firstName || !data.learner.lastName) throw new HttpError(400, 'First name and last name are required.');
    if (!/^\d{12}$/.test(data.learner.lrn)) throw new HttpError(400, 'LRN must contain exactly 12 digits.');
    if (!['Male', 'Female'].includes(data.learner.sex)) throw new HttpError(400, 'Choose Male or Female.');
    const date = data.learner.birthdate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > new Date().toISOString().slice(0, 10)) throw new HttpError(400, 'Enter a valid birthdate.');
    data.expected = {};
    for (const key of ['learnerUpdatedAt', 'eligibilityUpdatedAt']) {
      const value = input.expected?.[key];
      if ((key === 'learnerUpdatedAt' && !value) || (value != null && (typeof value !== 'string' || !Number.isFinite(Date.parse(value))))) throw new HttpError(400, 'Refresh the record before editing its details.');
      data.expected[key] = value ?? null;
    }
    return data;
  }
  const reason = text(input.reason, 1500);
  if (!reason) throw new HttpError(400, 'Enter a reason for this record change.');
  const data = { reason };
  if (action === 'eligibility') {
    data.studentId = text(input.studentId);
    data.details = {};
    for (const key of ['basis', 'elementarySchool', 'schoolId', 'schoolAddress', 'graduationYear', 'schoolYearEnrolled', 'assessmentRating', 'assessmentDate', 'assessmentCenter', 'otherCredential']) {
      data.details[key] = text(input.details?.[key], 400);
    }
    const value = input.details?.generalAverage;
    if (value !== '' && value != null && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) throw new HttpError(400, 'General average must be between 0 and 100.');
    data.details.generalAverage = value === '' || value == null ? null : Number(value);
    data.details.eligible = typeof input.details?.eligible === 'boolean' ? input.details.eligible : null;
    const date = data.details.assessmentDate;
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new HttpError(400, 'Enter a valid assessment date.');
  } else if (['correct-history', 'prior-record'].includes(action)) {
    data.studentId = text(input.studentId); data.schoolYear = text(input.schoolYear); data.subjectId = text(input.subjectId);
    data.grades = {};
    if (action === 'prior-record') {
      for (const key of ['gradeLevel', 'section', 'adviser', 'school', 'schoolId', 'district', 'division', 'region']) data[key] = text(input[key], 400);
      if (!/^Grade (7|8|9)$/.test(data.gradeLevel) || !/^\d{4}-\d{4}$/.test(data.schoolYear) || !data.school || !data.section) throw new HttpError(400, 'Enter the prior grade level, school year, school, and section.');
      if (Number(data.schoolYear.slice(5)) !== Number(data.schoolYear.slice(0, 4)) + 1) throw new HttpError(400, 'Enter a valid prior school year.');
    }
    for (const field of ['quarter1', 'quarter2', 'quarter3', 'quarter4']) {
      const value = input.grades?.[field];
      if (value != null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)) throw new HttpError(400, 'Each grade must be a number between 0 and 100.');
      data.grades[field] = value ?? null;
    }
  } else if (action === 'year') {
    data.schoolYear = text(input.schoolYear);
    const match = /^(\d{4})-(\d{4})$/.exec(data.schoolYear);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) throw new HttpError(400, 'Use a school year such as 2027-2028.');
    data.activate = input.activate === true;
  } else if (action === 'class') {
    data.schoolYear = text(input.schoolYear); data.section = text(input.section, 100);
    data.gradeLevel = text(input.gradeLevel); data.adviserId = text(input.adviserId) || null;
    if (!/^Grade (7|8|9|10)$/.test(data.gradeLevel) || !data.section) throw new HttpError(400, 'Choose a grade level and enter a section.');
  } else if (action === 'assignment') {
    data.classId = text(input.classId); data.subjectId = text(input.subjectId); data.teacherId = text(input.teacherId);
    if (!data.classId || !data.subjectId || !data.teacherId) throw new HttpError(400, 'Choose a class, subject, and approved teacher.');
  } else if (action === 'advance') {
    data.studentIds = [...new Set(Array.isArray(input.studentIds) ? input.studentIds.map(id => text(id)).filter(Boolean) : [])];
    data.targetClassId = text(input.targetClassId) || null;
    data.outcome = input.outcome;
    if (!['promote', 'retain', 'graduate'].includes(data.outcome) || !data.studentIds.length || data.studentIds.length > 100 || (data.outcome !== 'graduate' && !data.targetClassId)) throw new HttpError(400, 'Select up to 100 learners and confirm their enrollment outcome.');
  } else throw new HttpError(400, 'Unknown academic action.');
  if (['eligibility', 'correct-history', 'prior-record'].includes(action) && !data.studentId) throw new HttpError(400, 'Choose a learner.');
  return data;
}
