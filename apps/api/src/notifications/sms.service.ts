import { Injectable, Logger } from '@nestjs/common';

/**
 * SMS sender. Dev/default is a mock that logs the message.
 * Live mode (msg91/gupshup) MUST send over a DLT-registered route with an
 * approved template + PE ID — see plans/07-verification-kyc.md.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly mode = process.env.SMS_PROVIDER ?? 'mock';

  async sendOtp(phone: string, code: string): Promise<void> {
    if (this.mode === 'mock') {
      this.logger.log(`[mock-sms] OTP for ${phone}: ${code}`);
      return;
    }
    // TODO(PR-live): integrate MSG91/Gupshup over DLT route with approved template.
    throw new Error(`SMS provider "${this.mode}" not implemented yet`);
  }
}
