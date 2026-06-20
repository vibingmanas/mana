import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface DigiLockerIdentity {
  aadhaarNumber: string;
  name: string;
}

const STATE_TTL_MS = 10 * 60 * 1000;
// UIDAI public test Aadhaar (Verhoeff-valid) used for the mock consent flow.
const MOCK_AADHAAR = '999999990019';

/**
 * DigiLocker consent + redirect (OAuth2 authorization-code) flow for fetching a
 * dealer's e-Aadhaar. Key-ready: live when DIGILOCKER_CLIENT_ID is set, otherwise
 * a deterministic mock so the consent → callback round-trip is fully exercisable.
 * CSRF is prevented with a short-lived HMAC-signed `state` bound to the user.
 */
@Injectable()
export class DigiLockerService {
  private readonly logger = new Logger(DigiLockerService.name);
  private readonly clientId = process.env.DIGILOCKER_CLIENT_ID ?? '';
  private readonly clientSecret = process.env.DIGILOCKER_CLIENT_SECRET ?? '';
  private readonly redirectUri = process.env.DIGILOCKER_REDIRECT_URI ?? '';
  private readonly baseUrl = (
    process.env.DIGILOCKER_BASE_URL ?? 'https://digilocker.meripehchaan.gov.in'
  ).replace(/\/$/, '');

  isLive(): boolean {
    return this.clientId.length > 0 && this.clientSecret.length > 0;
  }

  // ── signed state (CSRF) ──
  signState(userId: string): string {
    const payload = Buffer.from(
      JSON.stringify({ u: userId, e: Date.now() + STATE_TTL_MS }),
    ).toString('base64url');
    const sig = this.sign(payload);
    return `${payload}.${sig}`;
  }

  verifyState(state: string, userId: string): void {
    const [payload, sig] = (state ?? '').split('.');
    if (!payload || !sig) throw new BadRequestException('Malformed state');
    const expected = this.sign(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestException('Invalid state signature');
    }
    let data: { u: string; e: number };
    try {
      data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    } catch {
      throw new BadRequestException('Corrupt state');
    }
    if (data.u !== userId) throw new BadRequestException('State does not match user');
    if (Date.now() > data.e) throw new BadRequestException('Consent request expired; restart');
  }

  private sign(payload: string): string {
    return createHmac('sha256', process.env.JWT_SECRET ?? 'dev-secret')
      .update(payload)
      .digest('base64url');
  }

  /** The DigiLocker consent URL the dealer is redirected to. */
  buildAuthUrl(state: string): string {
    if (!this.isLive()) {
      // Mock consent page that immediately bounces back to our callback with a code.
      const cb = this.redirectUri || 'http://localhost:3000/onboarding/digilocker/callback';
      const u = new URL(cb);
      u.searchParams.set('code', `mock-${state.slice(0, 8)}`);
      u.searchParams.set('state', state);
      u.searchParams.set('mock', '1');
      return u.toString();
    }
    const u = new URL(`${this.baseUrl}/public/oauth2/1/authorize`);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('client_id', this.clientId);
    u.searchParams.set('redirect_uri', this.redirectUri);
    u.searchParams.set('state', state);
    u.searchParams.set('dl_flow', 'consent');
    return u.toString();
  }

  /** Exchange the authorization code and fetch the e-Aadhaar identity. */
  async exchangeAndFetch(code: string): Promise<DigiLockerIdentity> {
    if (!code) throw new BadRequestException('Missing authorization code');
    if (!this.isLive()) {
      return { aadhaarNumber: MOCK_AADHAAR, name: 'DigiLocker Test User' };
    }
    const tokenRes = await fetch(`${this.baseUrl}/public/oauth2/1/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      this.logger.warn(`DigiLocker token exchange failed: ${tokenRes.status}`);
      throw new BadRequestException('DigiLocker authorization failed');
    }
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) throw new BadRequestException('No access token from DigiLocker');

    const eaadhaar = await fetch(`${this.baseUrl}/public/oauth2/1/xml/eaadhaar`, {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    if (!eaadhaar.ok) throw new BadRequestException('Could not fetch e-Aadhaar');
    const data = (await eaadhaar.json()) as { aadhaar?: string; uid?: string; name?: string };
    const aadhaarNumber = (data.aadhaar ?? data.uid ?? '').replace(/\s/g, '');
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      throw new BadRequestException('DigiLocker returned an invalid Aadhaar');
    }
    return { aadhaarNumber, name: data.name ?? '' };
  }
}
