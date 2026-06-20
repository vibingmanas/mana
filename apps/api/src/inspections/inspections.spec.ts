import { describe, it, expect } from 'vitest';
import { assessOdometer } from './odometer';
import { scoreInspection, gradeFor, mockAiSectionScores } from './inspection-score';

describe('assessOdometer', () => {
  it('LOW when mileage matches age', () => {
    expect(assessOdometer({ declaredKm: 84000, manufactureYear: 2019, now: 2026 }).fraudRisk).toBe(
      'LOW',
    );
  });

  it('HIGH on a rollback vs prior reading', () => {
    const r = assessOdometer({
      declaredKm: 40000,
      manufactureYear: 2019,
      now: 2026,
      priorReadings: [70000],
    });
    expect(r.fraudRisk).toBe('HIGH');
    expect(r.signals.join(' ')).toMatch(/rollback/i);
  });

  it('HIGH when far below expected for age', () => {
    expect(assessOdometer({ declaredKm: 15000, manufactureYear: 2016, now: 2026 }).fraudRisk).toBe(
      'HIGH',
    );
  });

  it('MEDIUM when moderately low', () => {
    expect(assessOdometer({ declaredKm: 35000, manufactureYear: 2018, now: 2026 }).fraudRisk).toBe(
      'MEDIUM',
    );
  });

  it('MEDIUM when unusually high', () => {
    expect(assessOdometer({ declaredKm: 250000, manufactureYear: 2022, now: 2026 }).fraudRisk).toBe(
      'MEDIUM',
    );
  });
});

describe('inspection scoring', () => {
  it('averages and grades', () => {
    expect(scoreInspection({ a: 90, b: 80 })).toEqual({ overall: 85, grade: 'A' });
  });
  it('grade boundaries', () => {
    expect(gradeFor(85)).toBe('A');
    expect(gradeFor(70)).toBe('B');
    expect(gradeFor(50)).toBe('C');
    expect(gradeFor(49)).toBe('D');
  });
  it('older cars get lower mock AI scores', () => {
    const newer = scoreInspection(mockAiSectionScores(1)).overall;
    const older = scoreInspection(mockAiSectionScores(10)).overall;
    expect(newer).toBeGreaterThan(older);
  });
});
