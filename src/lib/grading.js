import { getGradeDescriptor, getRemarks } from './utils.js';
import { getCurriculumForGradeLevel } from '../data/curriculum.js';

// Grade 10 numerical grade → descriptor scale (DepEd MATATAG / current G10).
const GRADE_10_SCALE = [
  { min: 90, max: 100, level: 'Advancing', filipinoDescriptor: 'Namumukod-tangi' },
  { min: 80, max: 89, level: 'Benchmarking', filipinoDescriptor: 'Napapamalas' },
  { min: 75, max: 79, level: 'Connecting', filipinoDescriptor: 'Natuntungo' },
  { min: 65, max: 74, level: 'Developing', filipinoDescriptor: 'Napaunlad' },
  { min: 0, max: 64, level: 'Emerging', filipinoDescriptor: 'Nasisimula' },
];

function findGrade10Band(grade) {
  const num = Number(grade);
  if (Number.isNaN(num)) return null;
  return GRADE_10_SCALE.find((band) => num >= band.min && num <= band.max) ?? null;
}

/**
 * Grade 10 descriptor from a numerical final rating.
 * @returns {{ level: string, filipinoDescriptor: string }}
 */
export function getGrade10Descriptor(grade) {
  if (grade === null || grade === undefined || grade === '') {
    return { level: '', filipinoDescriptor: '' };
  }
  const band = findGrade10Band(grade);
  return {
    level: band?.level ?? '',
    filipinoDescriptor: band?.filipinoDescriptor ?? '',
  };
}

/** Curriculum-aware descriptor + remarks for display in Class Record / SF10. */
export function getDescriptorForGradeLevel(gradeLevel, grade) {
  const scale = getCurriculumForGradeLevel(gradeLevel).scale;
  if (grade === null || grade === undefined || grade === '') {
    return { descriptor: '', filipinoDescriptor: '', remarks: '', level: '' };
  }
  if (scale === 'grade10') {
    const { level, filipinoDescriptor } = getGrade10Descriptor(grade);
    return { descriptor: level, filipinoDescriptor, remarks: '', level };
  }
  return {
    descriptor: getGradeDescriptor(grade),
    filipinoDescriptor: '',
    remarks: getRemarks(grade),
    level: getGradeDescriptor(grade),
  };
}

/** Formats descriptor for table cells — includes Filipino label for Grade 10. */
export function formatDescriptorDisplay(gradeLevel, grade) {
  const { descriptor, filipinoDescriptor } = getDescriptorForGradeLevel(gradeLevel, grade);
  if (!descriptor) return '';
  if (filipinoDescriptor) return `${descriptor} (${filipinoDescriptor})`;
  return descriptor;
}
