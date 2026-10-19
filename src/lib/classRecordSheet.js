const STORAGE_PREFIX = 'sf10_class_record_sheet_v1';

export const WW_COUNT = 10;
export const PT_COUNT = 10;
export const QA_COUNT = 2;

export function sheetStorageKey({ classId, subjectId, schoolYear, periodId }) {
  return `${STORAGE_PREFIX}:${classId}:${subjectId}:${schoolYear}:${periodId}`;
}

export function createEmptyScoreSet() {
  return {
    ww: Array(WW_COUNT).fill(''),
    pt: Array(PT_COUNT).fill(''),
    qa: Array(QA_COUNT).fill(''),
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

function parseScore(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return num;
}

function categoryAverage(values) {
  const nums = values.map(parseScore).filter((n) => n !== null);
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

/**
 * DepEd-style initial grade using subject-specific WW / PT / EX weights.
 * @param {{ ww: string[], pt: string[], qa: string[] }} scoreSet
 * @param {{ ww?: number, pt?: number, ex?: number }} [weights]
 */
export function computeInitialGrade(scoreSet, weights = { ww: 0.2, pt: 0.5, ex: 0.3 }) {
  const ww = categoryAverage(scoreSet.ww);
  const pt = categoryAverage(scoreSet.pt);
  const ex = categoryAverage(scoreSet.qa);

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

export function normalizeScoreSet(raw) {
  const base = createEmptyScoreSet();
  if (!raw) return base;
  return {
    ww: Array.from({ length: WW_COUNT }, (_, i) => String(raw.ww?.[i] ?? '')),
    pt: Array.from({ length: PT_COUNT }, (_, i) => String(raw.pt?.[i] ?? '')),
    qa: Array.from({ length: QA_COUNT }, (_, i) => String(raw.qa?.[i] ?? '')),
  };
}
