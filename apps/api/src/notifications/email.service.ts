import { Injectable, Logger } from '@nestjs/common';

/**
 * Email sender. Default mock logs the message. Live mode (resend) sends a real
 * email via the Resend API when EMAIL_PROVIDER=resend + RESEND_API_KEY set.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly mode = process.env.EMAIL_PROVIDER ?? 'mock';

  async sendOtp(email: string, code: string): Promise<void> {
    if (this.mode === 'resend') return this.sendViaResend(email, code);
    if (this.mode !== 'mock') throw new Error(`Email provider "${this.mode}" not implemented`);
    this.logger.log(`[mock-email] OTP for ${email}: ${code}`);
  }

  private async sendViaResend(email: string, code: string): Promise<void> {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? 'Mana <onboarding@resend.dev>';
    if (!key) throw new Error('RESEND_API_KEY not set');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `${code} is your Mana verification code`,
        text: `Your Mana verification code is ${code}. It expires in 5 minutes.`,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend send failed: HTTP ${res.status} ${body.slice(0, 120)}`);
    }
    this.logger.log(`Resend OTP dispatched to ${email}`);
  }
}
