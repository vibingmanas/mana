import { describe, it, expect } from 'vitest';
import { savedSearchMatches } from './match';

const car = {
  make: 'Maruti Suzuki',
  model: 'Swift',
  city: 'Pune',
  fuelType: 'Petrol',
  price: 500000,
};

describe('savedSearchMatches', () => {
  it('matches on make substring + price ceiling', () => {
    expect(savedSearchMatches({ make: 'maruti', maxPrice: 600000 }, car)).toBe(true);
  });
  it('fails when above maxPrice', () => {
    expect(savedSearchMatches({ maxPrice: 400000 }, car)).toBe(false);
  });
  it('fails on different make', () => {
    expect(savedSearchMatches({ make: 'Honda' }, car)).toBe(false);
  });
  it('fuel type is exact (case-insensitive)', () => {
    expect(savedSearchMatches({ fuelType: 'petrol' }, car)).toBe(true);
    expect(savedSearchMatches({ fuelType: 'diesel' }, car)).toBe(false);
  });
  it('empty query matches anything', () => {
    expect(savedSearchMatches({}, car)).toBe(true);
  });
});
