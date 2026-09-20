// Deterministic pseudo-random grade generator used only to seed mock data.
// Same seed always produces the same value, so the demo data is stable
// across reloads without hand-typing hundreds of numbers.
export function seededGrade(seed, min = 82, max = 97) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const span = max - min + 1;
  return min + (hash % span);
}
