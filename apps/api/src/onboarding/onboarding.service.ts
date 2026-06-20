import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CheckType, DealerStatus, UserRole, VerificationStatus, VerificationTier } from '@mana/db';
import type { Dealer, DealerKYC } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../auth/otp.service';
import { VerificationService } from '../verification/verification.service';
import { computeTier, completedSteps, nextStep } from './tier';
import type { UpdateProfileDto } from './dto';

export interface ConsentMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly verification: VerificationService,
  ) {}

  private async getDealerOrThrow(userId: string): Promise<Dealer & { kyc: DealerKYC | null }> {
    const dealer = await this.prisma.dealer.findUnique({
      where: { ownerUserId: userId },
      include: { kyc: true },
    });
    if (!dealer) throw new NotFoundException('No dealer profile; call /onboarding/start first');
    return dealer;
  }

  async start(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.DEALER_OWNER) {
      throw new ForbiddenException('Sign in as a dealer to onboard');
    }

    const existing = await this.prisma.dealer.findUnique({ where: { ownerUserId: userId } });
    if (!existing) {
      await this.prisma.dealer.create({
        data: {
          ownerUserId: userId,
          status: DealerStatus.DRAFT,
          verificationTier: VerificationTier.T0,
          kyc: { create: { phoneVerifiedAt: user.phoneVerifiedAt ?? new Date() } },
          onboarding: { create: { currentStep: 'email' } },
        },
      });
    }
    return this.status(userId);
  }

  async requestEmailOtp(email: string) {
    return this.otp.request('email', email, 'onboarding');
  }

  async verifyEmail(userId: string, email: string, code: string) {
    const dealer = await this.getDealerOrThrow(userId);
    const ok = await this.otp.verify('email', email, code, 'onboarding');
    if (!ok) throw new BadRequestException('Invalid or expired OTP');
    await this.prisma.dealerKYC.update({
      where: { dealerId: dealer.id },
      data: { emailVerifiedAt: new Date() },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { email, emailVerifiedAt: new Date() },
    });
    return this.sync(dealer.id);
  }

  async verifyAadhaar(userId: string, aadhaarNumber: string, meta: ConsentMeta) {
    const dealer = await this.getDealerOrThrow(userId);
    const res = await this.verification.runCheck({
      subjectType: 'dealer',
      subjectId: dealer.id,
      checkType: CheckType.AADHAAR,
      input: { aadhaarNumber },
      consent: { purpose: 'dealer_onboarding_aadhaar', documentType: 'aadhaar', ...meta },
    });
    this.assertSuccess(res.status, 'Aadhaar');
    await this.prisma.dealerKYC.update({
      where: { dealerId: dealer.id },
      data: {
        aadhaarVaultToken: String(res.result.aadhaarVaultToken ?? ''),
        aadhaarNameMasked: String(res.result.nameMasked ?? ''),
        aadhaarMethod: String(res.result.method ?? 'digilocker'),
        aadhaarVerifiedAt: new Date(),
      },
    });
    return this.sync(dealer.id);
  }

  async verifyPan(userId: string, pan: string, meta: ConsentMeta) {
    const dealer = await this.getDealerOrThrow(userId);
    const res = await this.verification.runCheck({
      subjectType: 'dealer',
      subjectId: dealer.id,
      checkType: CheckType.PAN,
      input: { pan },
      consent: { purpose: 'dealer_onboarding_pan', documentType: 'pan', ...meta },
    });
    this.assertSuccess(res.status, 'PAN');
    await this.prisma.dealerKYC.update({
      where: { dealerId: dealer.id },
      data: { pan, panName: String(res.result.name ?? ''), panVerifiedAt: new Date() },
    });
    return this.sync(dealer.id);
  }

  async verifyGst(userId: string, gstin: string, meta: ConsentMeta) {
    const dealer = await this.getDealerOrThrow(userId);
    const res = await this.verification.runCheck({
      subjectType: 'dealer',
      subjectId: dealer.id,
      checkType: CheckType.GST,
      input: { gstin },
      consent: { purpose: 'dealer_onboarding_gst', documentType: 'gst', ...meta },
    });
    this.assertSuccess(res.status, 'GST');
    await this.prisma.dealerKYC.update({
      where: { dealerId: dealer.id },
      data: {
        gstin,
        gstLegalName: String(res.result.legalName ?? ''),
        gstStatus: String(res.result.gstStatus ?? ''),
        gstVerifiedAt: new Date(),
      },
    });
    return this.sync(dealer.id);
  }

  async verifyBank(userId: string, accountNumber: string, ifsc: string, meta: ConsentMeta) {
    const dealer = await this.getDealerOrThrow(userId);
    const res = await this.verification.runCheck({
      subjectType: 'dealer',
      subjectId: dealer.id,
      checkType: CheckType.BANK,
      input: { accountNumber, ifsc },
      consent: { purpose: 'dealer_onboarding_bank', documentType: 'bank', ...meta },
    });
    this.assertSuccess(res.status, 'Bank account');
    await this.prisma.dealerKYC.update({
      where: { dealerId: dealer.id },
      data: {
        bankAccountRef: `XXXXXX${accountNumber.slice(-4)}`,
        bankName: ifsc.slice(0, 4),
        bankAccountName: String(res.result.accountName ?? ''),
        bankVerifiedAt: new Date(),
      },
    });
    return this.sync(dealer.id);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const dealer = await this.getDealerOrThrow(userId);
    await this.prisma.dealer.update({ where: { id: dealer.id }, data: { ...dto } });
    return this.status(userId);
  }

  async status(userId: string) {
    const dealer = await this.getDealerOrThrow(userId);
    const kyc = dealer.kyc;
    const tier = kyc
      ? computeTier({
          emailVerifiedAt: kyc.emailVerifiedAt,
          phoneVerifiedAt: kyc.phoneVerifiedAt,
          aadhaarVerifiedAt: kyc.aadhaarVerifiedAt,
          panVerifiedAt: kyc.panVerifiedAt,
          gstVerifiedAt: kyc.gstVerifiedAt,
          bankVerifiedAt: kyc.bankVerifiedAt,
        })
      : VerificationTier.T0;
    return {
      dealer: {
        id: dealer.id,
        displayName: dealer.displayName,
        legalName: dealer.legalName,
        city: dealer.city,
        state: dealer.state,
        status: dealer.status,
        verificationTier: tier,
      },
      completedSteps: kyc ? completedSteps(kyc) : [],
      nextStep: kyc ? nextStep(kyc) : 'phone',
    };
  }

  /** Recompute tier + dealer status from current KYC, persist, and return status. */
  private async sync(dealerId: string) {
    const kyc = await this.prisma.dealerKYC.findUniqueOrThrow({ where: { dealerId } });
    const tier = computeTier(kyc);
    const status = tier === VerificationTier.T0 ? DealerStatus.DRAFT : DealerStatus.ACTIVE;
    const dealer = await this.prisma.dealer.update({
      where: { id: dealerId },
      data: { verificationTier: tier, status },
    });
    await this.prisma.onboardingProgress.update({
      where: { dealerId },
      data: {
        completedSteps: completedSteps(kyc),
        currentStep: nextStep(kyc) ?? 'done',
        lastActiveAt: new Date(),
      },
    });
    return this.status(dealer.ownerUserId);
  }

  private assertSuccess(status: VerificationStatus, label: string) {
    if (status === VerificationStatus.SUCCESS) return;
    if (status === VerificationStatus.MANUAL_REVIEW) {
      throw new BadRequestException(`${label} needs manual review; our team will follow up`);
    }
    throw new BadRequestException(`${label} verification failed`);
  }
}
