import { Injectable, Logger } from '@nestjs/common';

/** Email sender. Dev/default mock logs the message. Live: SES/Resend/SendGrid. */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly mode = process.env.EMAIL_PROVIDER ?? 'mock';

  async sendOtp(email: string, code: string): Promise<void> {
    if (this.mode === 'mock') {
      this.logger.log(`[mock-email] OTP for ${email}: ${code}`);
      return;
    }
    throw new Error(`Email provider "${this.mode}" not implemented yet`);
  }
}
