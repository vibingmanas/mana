import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  afterEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  it('is mock (not live) without keys; createSubscriptionPayment returns paid', async () => {
    const p = new PaymentsService();
    expect(p.isLive).toBe(false);
    const link = await p.createSubscriptionPayment('d1:growth', 2359, 'x');
    expect(link.paid).toBe(true);
    expect(link.checkoutUrl).toBeUndefined();
  });

  it('is live when key id + secret are set', () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test';
    process.env.RAZORPAY_KEY_SECRET = 'secret';
    expect(new PaymentsService().isLive).toBe(true);
  });

  it('verifies a webhook signature, rejects a bad one', () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec';
    const p = new PaymentsService();
    const body = JSON.stringify({ event: 'payment_link.paid' });
    const sig = createHmac('sha256', 'whsec').update(body).digest('hex');
    expect(p.verifyWebhook(body, sig)).toBe(true);
    expect(p.verifyWebhook(body, 'deadbeef')).toBe(false);
    expect(p.verifyWebhook(body, undefined)).toBe(false);
  });
});
