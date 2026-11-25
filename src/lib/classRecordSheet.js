const STORAGE_PREFIX = 'sf10_class_record_sheet_v1';

export const WW_COUNT = 10;
export const PT_COUNT = 10;
export const QA_COUNT = 3;

export function getAssessmentCounts(gradeLevel) {
  const extra = ['Grade 7', 'Grade 8', 'Grade 9'].includes(gradeLevel) ? 4 : 0;
  return { ww: WW_COUNT + extra, pt: PT_COUNT + extra, qa: QA_COUNT };
}

export function sheetStorageKey({ classId, subjectId, schoolYear, periodId }) {
  return `${STORAGE_PREFIX}:${classId}:${subjectId}:${schoolYear}:${periodId}`;
}

export function createEmptyScoreSet(gradeLevel) {
  const counts = getAssessmentCounts(gradeLevel);
  return {
    ww: Array(counts.ww).fill(''),
    pt: Array(counts.pt).fill(''),
    qa: Array(counts.qa).fill(''),
  };
}

export function loadSheetScores(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSheetScores(key, scoresByStudent) {
  try {
    localStorage.setItem(key, JSON.stringify(scoresByStudent));
  } catch {
    // ignore quota errors
  }
}

const SCORE_CATEGORIES = ['ww', 'pt', 'qa'];
export const isBlankScore = value => value === null || value === undefined || String(value).trim() === '';

export function loadSheetTotalPoints(key, legacyScores = {}, gradeLevel) {
  try {
    const raw = localStorage.getItem(`${key}:total-points`);
    if (raw) return normalizeScoreSet(JSON.parse(raw), gradeLevel);
  } catch { /* fall back to the existing percentage-based scores */ }
  const totals = createEmptyScoreSet(gradeLevel);
  for (const category of SCORE_CATEGORIES) {
    totals[category] = totals[category].map((_, index) => Object.values(legacyScores).some(scores => !isBlankScore(scores?.[category]?.[index])) ? '100' : '');
  }
  return totals;
}

export function saveSheetTotalPoints(key, totals) {
  try { localStorage.setItem(`${key}:total-points`, JSON.stringify(totals)); }
  catch { /* ignore quota errors */ }
}

function isValidTotalPoints(value) {
  return !isBlankScore(value) && Number.isFinite(Number(value)) && Number(value) > 0;
}

function isValidAssessmentScore(value, total) {
  if (isBlankScore(value)) return true;
  return isValidTotalPoints(total) && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= Number(total);
}

export function collectInvalidScoreCells(scoresByStudent, totals) {
  const invalid = new Set();
  for (const category of SCORE_CATEGORIES) {
    for (const [index, total] of totals[category].entries()) {
      if (!isBlankScore(total) && !isValidTotalPoints(total)) invalid.add(`totals:${category}:${index}`);
      for (const [studentId, scores] of Object.entries(scoresByStudent)) {
        if (!isValidAssessmentScore(scores[category][index], total)) {
          invalid.add(`${studentId}:${category}:${index}`);
          if (!isValidTotalPoints(total)) invalid.add(`totals:${category}:${index}`);
        }
      }
    }
  }
  return invalid;
}

export function categoryPercentage(values, totals) {
  let earned = 0;
  let possible = 0;
  for (const [index, value] of values.entries()) {
    if (isBlankScore(value)) continue;
    const total = totals === undefined ? 100 : totals[index];
    if (!isValidAssessmentScore(value, total)) return null;
    earned += Number(value);
    possible += Number(total);
  }
  return possible > 0 ? (earned / possible) * 100 : null;
}

/**
 * DepEd-style initial grade using subject-specific WW / PT / EX weights.
 * @param {{ ww: string[], pt: string[], qa: string[] }} scoreSet
 * @param {{ ww?: number, pt?: number, ex?: number }} [weights]
 * @param {{ ww: string[], pt: string[], qa: string[] }} [totalPoints] Assessment maxima; legacy callers use /100.
 */
export function computeInitialGrade(scoreSet, weights = { ww: 0.2, pt: 0.5, ex: 0.3 }, totalPoints) {
  const effectiveTotals = totalPoints ?? Object.fromEntries(SCORE_CATEGORIES.map(category => [category, scoreSet[category].map(() => '100')]));
  if (collectInvalidScoreCells({ student: scoreSet }, effectiveTotals).size) return null;
  const ww = categoryPercentage(scoreSet.ww, totalPoints?.ww);
  const pt = categoryPercentage(scoreSet.pt, totalPoints?.pt);
  const ex = categoryPercentage(scoreSet.qa, totalPoints?.qa);

  if (ww === null && pt === null && ex === null) return null;

  const wwWeight = weights.ww ?? 0.2;
  const ptWeight = weights.pt ?? 0.5;
  const exWeight = weights.ex ?? 0.3;

  const weighted = (ww ?? 0) * wwWeight + (pt ?? 0) * ptWeight + (ex ?? 0) * exWeight;
  return Math.round(weighted * 100) / 100;
}

function titleCaseWord(word) {
  if (!word) return '';
  const lower = word.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function titleCaseName(part) {
  return String(part)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(' ');
}

/** Display name for the class record (Last name, First name — readable title case). */
export function formatRecordName(student) {
  const last = titleCaseName(student.lastName ?? '');
  const first = titleCaseName(student.firstName ?? '');
  const middle = titleCaseName(student.middleName ?? '');
  const ext = titleCaseName(student.nameExtension ?? '');
  const given = [first, middle, ext].filter(Boolean).join(' ');
  if (!last && !given) return titleCaseName(student.name ?? 'Unknown');
  return `${last}${last && given ? ', ' : ''}${given}`;
}

export function normalizeScoreSet(raw, gradeLevel) {
  const base = createEmptyScoreSet(gradeLevel);
  if (!raw) return base;
  return {
    ww: base.ww.map((_, i) => String(raw.ww?.[i] ?? '')),
    pt: base.pt.map((_, i) => String(raw.pt?.[i] ?? '')),
    qa: base.qa.map((_, i) => String(raw.qa?.[i] ?? '')),
  };
}
