import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../notifications/sms.service';
import { EmailService } from '../notifications/email.service';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 3;

export interface OtpRequestResult {
  challengeId: string;
  /** Present only in mock mode (non-prod) to ease local/e2e testing. */
  devCode?: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly email: EmailService,
  ) {}

  private get isMock(): boolean {
    return (process.env.SMS_PROVIDER ?? 'mock') === 'mock' && process.env.NODE_ENV !== 'production';
  }

  async request(
    channel: 'phone' | 'email',
    destination: string,
    purpose: string,
  ): Promise<OtpRequestResult> {
    const since = new Date(Date.now() - RESEND_WINDOW_MS);
    const recent = await this.prisma.otpChallenge.count({
      where: { destination, purpose, createdAt: { gte: since } },
    });
    if (recent >= MAX_PER_WINDOW) {
      throw new BadRequestException('Too many OTP requests, try again shortly');
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);
    const challenge = await this.prisma.otpChallenge.create({
      data: {
        channel,
        destination,
        codeHash,
        purpose,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    if (channel === 'phone') await this.sms.sendOtp(destination, code);
    else await this.email.sendOtp(destination, code);

    return { challengeId: challenge.id, ...(this.isMock ? { devCode: code } : {}) };
  }

  /** Verify an OTP; consumes the challenge on success. Returns true if valid. */
  async verify(
    channel: 'phone' | 'email',
    destination: string,
    code: string,
    purpose: string,
  ): Promise<boolean> {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { destination, purpose, channel, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) return false;

    if (challenge.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Too many attempts; request a new code');
    }

    const ok = await bcrypt.compare(code, challenge.codeHash);
    if (!ok) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    return true;
  }
}
