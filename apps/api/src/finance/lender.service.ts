import { Injectable, Logger } from '@nestjs/common';
import { decideEligibility } from './emi';

export interface ConsumerDecision {
  approved: boolean;
  partner: string;
  reason: string;
  partnerRef?: string;
}

export interface FloorPlanDecision {
  approved: boolean;
  lender: string;
  creditLimit: number;
  interestApr: number;
  partnerRef?: string;
}

/**
 * Lender partner adapter. Key-ready: posts to a real lender API when LENDER_API_URL
 * is configured, otherwise uses the local heuristics so the flow is exercisable.
 */
@Injectable()
export class LenderService {
  private readonly logger = new Logger(LenderService.name);
  private readonly apiUrl = process.env.LENDER_API_URL ?? '';
  private readonly apiKey = process.env.LENDER_API_KEY ?? '';

  isLive(): boolean {
    return this.apiUrl.length > 0 && this.apiKey.length > 0;
  }

  /** Underwrite a consumer auto-loan application. */
  async underwriteConsumer(input: {
    amount: number;
    downPayment: number;
    tenureMonths: number;
  }): Promise<ConsumerDecision> {
    if (this.isLive()) {
      try {
        const res = await fetch(`${this.apiUrl}/v1/auto-loans/underwrite`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const d = (await res.json()) as Partial<ConsumerDecision>;
          return {
            approved: !!d.approved,
            partner: d.partner ?? 'Partner Lender',
            reason: d.reason ?? (d.approved ? 'Approved' : 'Declined'),
            partnerRef: d.partnerRef,
          };
        }
        this.logger.warn(`Lender underwrite ${res.status}; falling back to heuristic`);
      } catch (err) {
        this.logger.warn(`Lender API error, using heuristic: ${String(err)}`);
      }
    }
    const d = decideEligibility({
      price: input.amount,
      downPayment: input.downPayment,
      tenureMonths: input.tenureMonths,
    });
    return { approved: d.approved, partner: d.partner, reason: d.reason };
  }

  /** Underwrite a dealer floor-plan facility request. */
  async underwriteFloorPlan(input: { requestedLimit: number }): Promise<FloorPlanDecision> {
    if (this.isLive()) {
      try {
        const res = await fetch(`${this.apiUrl}/v1/floor-plan/underwrite`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const d = (await res.json()) as Partial<FloorPlanDecision>;
          return {
            approved: !!d.approved,
            lender: d.lender ?? 'Partner Lender',
            creditLimit: d.creditLimit ?? 0,
            interestApr: d.interestApr ?? 18,
            partnerRef: d.partnerRef,
          };
        }
        this.logger.warn(`Floor-plan underwrite ${res.status}; falling back to heuristic`);
      } catch (err) {
        this.logger.warn(`Lender API error, using heuristic: ${String(err)}`);
      }
    }
    // Heuristic: grant up to the requested limit, capped at ₹50L, 18% APR.
    const creditLimit = Math.min(Math.max(input.requestedLimit, 0), 5_000_000);
    return {
      approved: creditLimit > 0,
      lender: 'Mana Capital (heuristic)',
      creditLimit,
      interestApr: 18,
    };
  }
}
