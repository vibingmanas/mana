import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface PaymentLink {
  paid: boolean; // true = mock (treat as paid immediately)
  checkoutUrl?: string; // live = redirect the dealer here
  ref: string;
}

/**
 * Payments via Razorpay (key-ready). Live only when RAZORPAY_KEY_ID +
 * RAZORPAY_KEY_SECRET are set; otherwise mock = instant success.
 * See plans/12-monetization.md.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly keyId = process.env.RAZORPAY_KEY_ID ?? '';
  private readonly keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  private readonly webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';

  get isLive(): boolean {
    return !!this.keyId && !!this.keySecret;
  }

  /** Create a payment link (live) or signal instant-paid (mock). `ref` ties the
   * payment back to a dealer+plan via Razorpay reference_id. */
  async createSubscriptionPayment(
    ref: string,
    amountInr: number,
    description: string,
  ): Promise<PaymentLink> {
    if (!this.isLive) return { paid: true, ref };

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: amountInr * 100, // paise
        currency: 'INR',
        description,
        reference_id: ref,
        reminder_enable: true,
        notes: { ref },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      short_url?: string;
      id?: string;
      error?: { description?: string };
    };
    if (!res.ok || !json.short_url) {
      throw new Error(
        `Razorpay payment link failed: ${json.error?.description ?? `HTTP ${res.status}`}`,
      );
    }
    return { paid: false, checkoutUrl: json.short_url, ref };
  }

  /** Verify a Razorpay webhook signature against the raw request body. */
  verifyWebhook(rawBody: Buffer | string, signature: string | undefined): boolean {
    if (!this.webhookSecret || !signature) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
