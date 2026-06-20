import { describe, it, expect } from 'vitest';
import { DigiLockerService } from './digilocker.service';

const svc = new DigiLockerService();

describe('DigiLockerService state (CSRF)', () => {
  it('round-trips a state bound to the user', () => {
    const state = svc.signState('user-1');
    expect(() => svc.verifyState(state, 'user-1')).not.toThrow();
  });

  it('rejects a state replayed by another user', () => {
    const state = svc.signState('user-1');
    expect(() => svc.verifyState(state, 'user-2')).toThrow();
  });

  it('rejects a tampered signature', () => {
    const state = svc.signState('user-1');
    const tampered = state.slice(0, -2) + (state.endsWith('aa') ? 'bb' : 'aa');
    expect(() => svc.verifyState(tampered, 'user-1')).toThrow();
  });

  it('rejects malformed state', () => {
    expect(() => svc.verifyState('garbage', 'user-1')).toThrow();
  });
});

describe('DigiLockerService mock flow', () => {
  it('builds a consent url carrying the state and a code', () => {
    const state = svc.signState('user-1');
    const url = new URL(svc.buildAuthUrl(state));
    expect(url.searchParams.get('state')).toBe(state);
    expect(url.searchParams.get('code')).toBeTruthy();
  });

  it('returns a valid 12-digit Aadhaar in mock mode', async () => {
    const id = await svc.exchangeAndFetch('mock-code');
    expect(id.aadhaarNumber).toMatch(/^\d{12}$/);
  });
});
