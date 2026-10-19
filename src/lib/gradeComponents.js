/**
 * DepEd grade component weights by subject (SY 2026–2027).
 * Written Works (WW), Performance Tasks (PT), Examinations (EX).
 */

export const DEFAULT_GRADE_COMPONENTS = {
  ww: 0.2,
  pt: 0.5,
  ex: 0.3,
  label: 'Written Works 20% · Performance Tasks 50% · Examinations 30%',
};

const MAPEH_STYLE = {
  ww: 0.2,
  pt: 0.6,
  ex: 0.2,
  label: 'Written Works 20% · Performance Tasks 60% · Examinations 20%',
};

/** @type {Record<string, { ww: number, pt: number, ex: number, label: string }>} */
export const GRADE_COMPONENTS_BY_SUBJECT_ID = {
  FIL: DEFAULT_GRADE_COMPONENTS,
  ENG: DEFAULT_GRADE_COMPONENTS,
  MATH: DEFAULT_GRADE_COMPONENTS,
  SCI: DEFAULT_GRADE_COMPONENTS,
  AP: DEFAULT_GRADE_COMPONENTS,
  ESP: DEFAULT_GRADE_COMPONENTS,
  TLE: DEFAULT_GRADE_COMPONENTS,
  MAPEH: MAPEH_STYLE,
  MUSIC_ARTS: MAPEH_STYLE,
  PE_HEALTH: MAPEH_STYLE,
  CREATIVE_TECH: MAPEH_STYLE,
  RESEARCH: DEFAULT_GRADE_COMPONENTS,
};

function matchSubjectKey(subjectId, subjectName) {
  const id = String(subjectId ?? '').toUpperCase();
  if (id && GRADE_COMPONENTS_BY_SUBJECT_ID[id]) {
    return id;
  }

  const name = String(subjectName ?? '').toLowerCase();
  if (name.includes('mapeh') || name.includes('music') || name.includes('physical education')) {
    return 'MAPEH';
  }
  if (name.includes('creative tech')) {
    return 'CREATIVE_TECH';
  }
  if (name.includes('research')) {
    return 'RESEARCH';
  }

  return 'DEFAULT';
}

export function getGradeComponentsForSubject(subjectId, subjectName = '') {
  const key = matchSubjectKey(subjectId, subjectName);
  if (key === 'DEFAULT') {
    return DEFAULT_GRADE_COMPONENTS;
  }
  return GRADE_COMPONENTS_BY_SUBJECT_ID[key] ?? DEFAULT_GRADE_COMPONENTS;
}

export function formatComponentWeights(components) {
  return components.label;
}
