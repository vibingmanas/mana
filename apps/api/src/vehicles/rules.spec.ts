import { describe, it, expect } from 'vitest';
import { publishBlocker } from './rules';

const ok = { tierOk: true, rcVerified: true, photoCount: 2, hasPrice: true };

describe('publishBlocker', () => {
  it('allows a fully-ready listing', () => {
    expect(publishBlocker(ok)).toBeNull();
  });

  it('blocks on insufficient tier', () => {
    expect(publishBlocker({ ...ok, tierOk: false })).toMatch(/tier/i);
  });

  it('blocks when RC not verified', () => {
    expect(publishBlocker({ ...ok, rcVerified: false })).toMatch(/RC/);
  });

  it('blocks with no photos', () => {
    expect(publishBlocker({ ...ok, photoCount: 0 })).toMatch(/photo/i);
  });

  it('blocks with no price', () => {
    expect(publishBlocker({ ...ok, hasPrice: false })).toMatch(/price/i);
  });

  it('reports tier first when multiple fail', () => {
    expect(
      publishBlocker({ tierOk: false, rcVerified: false, photoCount: 0, hasPrice: false }),
    ).toMatch(/tier/i);
  });
});
