import { describe, it, expect } from 'vitest';
import { VaultService } from './vault.service';

describe('VaultService', () => {
  const vault = new VaultService();

  it('masks all but the last 4 digits and never returns the raw number', () => {
    const { maskedNumber, token } = vault.storeAadhaar('1234 5678 9012');
    expect(maskedNumber).toBe('XXXXXXXX9012');
    expect(maskedNumber).not.toContain('5678');
    expect(token).toHaveLength(32);
  });

  it('derives a stable token for the same number', () => {
    expect(vault.storeAadhaar('123456789012').token).toBe(
      vault.storeAadhaar('1234 5678 9012').token,
    );
  });

  it('masks names keeping only the first letter of each part', () => {
    expect(vault.maskName('Ravi Kumar')).toBe('R*** K****');
  });
});
