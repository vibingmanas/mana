import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';

export interface SignatureRequest {
  ref: string;
  signUrl: string;
  status: 'PENDING';
}

/**
 * eSign (Aadhaar eSign / Digio / Leegality) adapter for loan agreements.
 * Key-ready: posts to a real provider when ESIGN_API_URL is set, otherwise a
 * deterministic mock whose callback ref can be replayed to complete the signing.
 */
@Injectable()
export class ESignService {
  private readonly logger = new Logger(ESignService.name);
  private readonly apiUrl = process.env.ESIGN_API_URL ?? '';
  private readonly apiKey = process.env.ESIGN_API_KEY ?? '';
  private readonly callbackBase =
    process.env.ESIGN_CALLBACK_URL ?? 'http://localhost:3000/finance/esign/callback';

  isLive(): boolean {
    return this.apiUrl.length > 0 && this.apiKey.length > 0;
  }

  /** Create a signature request for a document; returns the URL the signer visits. */
  async createRequest(input: {
    applicationId: string;
    signerName?: string;
    documentTitle: string;
  }): Promise<SignatureRequest> {
    if (this.isLive()) {
      const res = await fetch(`${this.apiUrl}/v1/sign-requests`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          reference_id: input.applicationId,
          signer_name: input.signerName,
          title: input.documentTitle,
          callback_url: this.callbackBase,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`eSign create failed: ${res.status}`);
        throw new BadRequestException('Could not start eSign');
      }
      const d = (await res.json()) as { id?: string; sign_url?: string };
      if (!d.id || !d.sign_url) throw new BadRequestException('Malformed eSign response');
      return { ref: d.id, signUrl: d.sign_url, status: 'PENDING' };
    }
    // Mock: deterministic ref derived from the application id.
    const ref = `mock-esign-${createHash('sha256').update(input.applicationId).digest('hex').slice(0, 12)}`;
    const u = new URL(this.callbackBase);
    u.searchParams.set('ref', ref);
    return { ref, signUrl: u.toString(), status: 'PENDING' };
  }

  /**
   * Confirm a completed signature. Live: verify with the provider. Mock: accept
   * any ref matching the expected deterministic value for the application.
   */
  async confirm(applicationId: string, ref: string): Promise<boolean> {
    if (!ref) throw new BadRequestException('Missing eSign ref');
    if (this.isLive()) {
      const res = await fetch(`${this.apiUrl}/v1/sign-requests/${ref}`, {
        headers: { authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) return false;
      const d = (await res.json()) as { status?: string };
      return d.status === 'signed' || d.status === 'completed';
    }
    const expected = `mock-esign-${createHash('sha256').update(applicationId).digest('hex').slice(0, 12)}`;
    return ref === expected;
  }
}
