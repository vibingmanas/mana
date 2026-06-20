import { Injectable } from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';

export interface VaultStoreResult {
  /** Opaque token stored in the app DB; the raw Aadhaar number is NOT. */
  token: string;
  /** First 8 digits masked per UIDAI rule. */
  maskedNumber: string;
}

/**
 * Aadhaar Data Vault (stub).
 *
 * Compliance (plans/07-verification-kyc.md): the full Aadhaar number must never
 * be stored in the app DB. In production this writes the encrypted number to a
 * dedicated KMS-backed store keyed by a UID token. This stub derives a stable
 * token and returns a masked number; it deliberately persists nothing raw.
 */
@Injectable()
export class VaultService {
  private readonly key = process.env.AADHAAR_VAULT_KEY ?? 'dev-vault-key';

  storeAadhaar(aadhaarNumber: string): VaultStoreResult {
    const normalized = aadhaarNumber.replace(/\s+/g, '');
    const token = createHmac('sha256', this.key)
      .update(createHash('sha256').update(normalized).digest('hex'))
      .digest('hex')
      .slice(0, 32);
    const last4 = normalized.slice(-4);
    const maskedNumber = `XXXXXXXX${last4}`;
    // NOTE: prod -> encrypt(normalized) into KMS vault under `token`. Here: no-op.
    return { token, maskedNumber };
  }

  maskName(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => (part ? `${part[0]}${'*'.repeat(Math.max(part.length - 1, 0))}` : part))
      .join(' ');
  }
}
