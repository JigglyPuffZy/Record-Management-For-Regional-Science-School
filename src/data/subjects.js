// Current and legacy learning areas. Keep IDs stable for existing academic records.
export const SUBJECTS = [
  { id: 'FIL', name: 'Filipino' },
  { id: 'ENG', name: 'English' },
  { id: 'MATH', name: 'Mathematics' },
  { id: 'SCI', name: 'Science' },
  { id: 'AP', name: 'Araling Panlipunan (AP)' },
  { id: 'VALUES_ED', name: 'Values Education' },
  { id: 'ESP', name: 'Edukasyon sa Pagpapakatao (ESP)' },
  { id: 'TLE', name: 'Technology and Livelihood Education (TLE)' },
  { id: 'MAPEH', name: 'MAPEH' },
  { id: 'MUSIC_ARTS', name: 'Music and Arts' },
  { id: 'PE_HEALTH', name: 'Physical Education and Health' },
  { id: 'CREATIVE_TECH', name: 'Creative Tech' },
  { id: 'RESEARCH', name: 'Research' },
];

export function getSubjectById(id) {
  return SUBJECTS.find((s) => s.id === id) ?? null;
}
