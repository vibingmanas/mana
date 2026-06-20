export const INSPECTION_SECTIONS = [
  'engine',
  'transmission',
  'electrical',
  'suspensionBrakes',
  'structureBody',
  'interior',
  'tyres',
  'ac',
] as const;

export type Section = (typeof INSPECTION_SECTIONS)[number];

export interface ScoreResult {
  overall: number; // 0..100
  grade: string; // A | B | C | D
}

export function gradeFor(overall: number): string {
  if (overall >= 85) return 'A';
  if (overall >= 70) return 'B';
  if (overall >= 50) return 'C';
  return 'D';
}

/** Average the section scores (clamped 0..100) into an overall + letter grade. */
export function scoreInspection(sectionScores: Record<string, number>): ScoreResult {
  const values = Object.values(sectionScores).map((v) => Math.max(0, Math.min(100, v)));
  if (values.length === 0) return { overall: 0, grade: 'D' };
  const overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return { overall, grade: gradeFor(overall) };
}

/**
 * Deterministic mock "AI from photos" section scores — older cars score a bit
 * lower. Stands in for a vision model (plan 08) so the flow is exercisable.
 */
export function mockAiSectionScores(ageYears: number): Record<Section, number> {
  const base = Math.max(55, 95 - ageYears * 4);
  const out = {} as Record<Section, number>;
  INSPECTION_SECTIONS.forEach((s, i) => {
    out[s] = Math.max(40, Math.min(100, base - (i % 3) * 3));
  });
  return out;
}
