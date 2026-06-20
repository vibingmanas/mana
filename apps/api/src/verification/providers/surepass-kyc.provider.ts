import { Injectable, Logger } from '@nestjs/common';
import { CheckType } from '@mana/db';
import type { NormalizedResult, VerificationProvider, VerifyInput } from './types';

/**
 * Live KYC + VAHAN provider (Surepass-style REST API). Active only when
 * KYC_PROVIDER_API_KEY is set; otherwise the registry falls back to the mock.
 * Aadhaar is intentionally NOT handled here — that requires the DigiLocker
 * consent/redirect flow (a separate, UI-driven path), so it stays on the mock
 * until that flow is wired. See plans/07-verification-kyc.md.
 */
@Injectable()
export class SurepassKycProvider implements VerificationProvider {
  readonly name = 'surepass';
  private readonly logger = new Logger(SurepassKycProvider.name);
  private readonly base = (
    process.env.KYC_PROVIDER_BASE_URL ?? 'https://kyc-api.surepass.io'
  ).replace(/\/$/, '');
  private readonly token = process.env.KYC_PROVIDER_API_KEY ?? '';

  static isConfigured(): boolean {
    return !!process.env.KYC_PROVIDER_API_KEY;
  }

  private readonly SUPPORTED = new Set<CheckType>([
    CheckType.PAN,
    CheckType.GST,
    CheckType.BANK,
    CheckType.VEHICLE_RC,
    CheckType.VEHICLE_CHALLAN,
  ]);

  supports(checkType: CheckType): boolean {
    return this.SUPPORTED.has(checkType);
  }

  async verify(checkType: CheckType, input: VerifyInput): Promise<NormalizedResult> {
    switch (checkType) {
      case CheckType.PAN:
        return this.call('/api/v1/pan/pan', { id_number: input.pan }, (d) => ({
          pan: input.pan,
          name: d.full_name ?? d.name ?? '',
        }));
      case CheckType.GST:
        return this.call('/api/v1/corporate/gstin', { id_number: input.gstin }, (d) => ({
          gstin: input.gstin,
          gstStatus: d.gstin_status ?? d.status ?? '',
          legalName: d.legal_name ?? d.business_name ?? '',
        }));
      case CheckType.BANK:
        return this.call(
          '/api/v1/bank-verification/',
          { id_number: input.accountNumber, ifsc: input.ifsc },
          (d) => ({ accountName: d.full_name ?? d.account_name ?? '', method: 'penny_drop' }),
        );
      case CheckType.VEHICLE_RC:
        return this.call('/api/v1/rc/rc-full', { id_number: input.regNumber }, (d) => ({
          rcOwnerName: d.owner_name ?? '',
          rcStatus: d.rc_status ?? d.status ?? '',
          rcMakeModel:
            [d.maker_description, d.maker_model].filter(Boolean).join(' ') || (d.maker_model ?? ''),
          rcFuel: d.fuel_type ?? '',
          insuranceValidTill: d.insurance_upto ?? null,
          insuranceProvider: d.insurance_company ?? '',
          pucValidTill: d.pucc_upto ?? null,
          hypothecationActive: !!(d.financer || d.financer_name),
          financerName: d.financer ?? d.financer_name ?? null,
        }));
      case CheckType.VEHICLE_CHALLAN:
        return this.call('/api/v1/rc/challan', { id_number: input.regNumber }, (d) => {
          const list = Array.isArray(d.challans) ? d.challans : [];
          return {
            challanCount: list.length,
            challanTotalAmount: list.reduce(
              (s: number, c: { amount?: number }) => s + (c.amount ?? 0),
              0,
            ),
          };
        });
      default:
        return { status: 'MANUAL_REVIEW', fields: {}, provider: this.name };
    }
  }

  private async call(
    path: string,
    body: Record<string, unknown>,
    map: (data: Record<string, any>) => Record<string, unknown>,
  ): Promise<NormalizedResult> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.token}` },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: Record<string, any>;
      message?: string;
    };
    if (!res.ok || json.success === false || !json.data) {
      this.logger.warn(`Surepass ${path} -> ${res.status} ${json.message ?? ''}`);
      return {
        status: 'FAILED',
        fields: { error: json.message ?? `HTTP ${res.status}` },
        provider: this.name,
      };
    }
    return { status: 'SUCCESS', fields: map(json.data), confidence: 0.95, provider: this.name };
  }
}
