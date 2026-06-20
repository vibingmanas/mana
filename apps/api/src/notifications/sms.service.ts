import { Injectable, Logger } from '@nestjs/common';

/**
 * SMS sender. Default is a mock that logs the message (and the OTP is returned
 * in the API response in mock mode). Live mode (msg91) sends over a
 * DLT-registered MSG91 Flow with an approved template — see plans/07.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly mode = process.env.SMS_PROVIDER ?? 'mock';

  async sendOtp(phone: string, code: string): Promise<void> {
    if (this.mode === 'msg91') return this.sendViaMsg91(phone, code);
    if (this.mode !== 'mock') throw new Error(`SMS provider "${this.mode}" not implemented`);
    this.logger.log(`[mock-sms] OTP for ${phone}: ${code}`);
  }

  /** MSG91 Flow API — DLT-registered template with an {{otp}} variable. */
  private async sendViaMsg91(phone: string, code: string): Promise<void> {
    const authkey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    if (!authkey || !templateId) throw new Error('MSG91_AUTH_KEY / MSG91_TEMPLATE_ID not set');
    const mobiles = phone.replace(/[^0-9]/g, ''); // E.164 → digits incl. country code

    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', authkey },
      body: JSON.stringify({
        template_id: templateId,
        ...(process.env.MSG91_SENDER_ID ? { sender: process.env.MSG91_SENDER_ID } : {}),
        recipients: [{ mobiles, otp: code, var1: code }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`MSG91 send failed: HTTP ${res.status} ${body.slice(0, 120)}`);
    }
    this.logger.log(`MSG91 OTP dispatched to ${mobiles}`);
  }
}
