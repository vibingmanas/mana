import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommissionSource,
  FinanceStatus,
  InsuranceStatus,
  Prisma,
  RcTransferStatus,
  VehicleStatus,
} from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { DealersService } from '../dealers/dealers.service';
import { computeEmi, decideEligibility } from './emi';

const RC_STEPS = ['form29', 'form30', 'noc', 'insurance_transfer'] as const;

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealers: DealersService,
  ) {}

  private async ensureBuyer(userId: string): Promise<string> {
    const buyer = await this.prisma.buyer.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return buyer.id;
  }

  private async liveVehicle(vehicleId: string) {
    const v = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!v || v.status !== VehicleStatus.LIVE) throw new NotFoundException('Listing not available');
    return v;
  }

  emiCalc(price: number, downPayment: number, rate: number, tenure: number) {
    return computeEmi(price, downPayment, rate, tenure);
  }

  async applyFinance(
    userId: string,
    vehicleId: string,
    amount: number,
    downPayment: number,
    tenureMonths: number,
  ) {
    const buyerId = await this.ensureBuyer(userId);
    const vehicle = await this.liveVehicle(vehicleId);
    const decision = decideEligibility({ price: amount, downPayment, tenureMonths });

    const app = await this.prisma.financeApplication.create({
      data: {
        buyerId,
        vehicleId,
        dealerId: vehicle.dealerId,
        amount,
        downPayment,
        tenureMonths,
        partner: decision.partner,
        status: decision.approved ? FinanceStatus.APPROVED : FinanceStatus.REJECTED,
      },
    });

    if (decision.approved) {
      const loan = amount - downPayment;
      await this.prisma.referralCommission.create({
        data: {
          sourceType: CommissionSource.FINANCE,
          sourceId: app.id,
          partner: decision.partner,
          amount: Math.round(loan * 0.01), // 1% referral
        },
      });
    }
    return { ...app, decisionReason: decision.reason };
  }

  async listFinance(userId: string) {
    const buyerId = await this.ensureBuyer(userId);
    return this.prisma.financeApplication.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      include: { vehicle: { select: { make: true, model: true } } },
    });
  }

  async quoteInsurance(userId: string, vehicleId: string) {
    const buyerId = await this.ensureBuyer(userId);
    const vehicle = await this.liveVehicle(vehicleId);
    const premium = Math.max(8000, Math.round((vehicle.price ?? 500000) * 0.03));
    return this.prisma.insurancePolicy.create({
      data: {
        buyerId,
        vehicleId,
        partner: 'Mana Insure (ACKO)',
        premium,
        coverage: { type: 'comprehensive', idv: vehicle.price ?? null } as Prisma.InputJsonValue,
        status: InsuranceStatus.QUOTED,
      },
    });
  }

  async purchaseInsurance(userId: string, policyId: string) {
    const buyerId = await this.ensureBuyer(userId);
    const policy = await this.prisma.insurancePolicy.findUnique({ where: { id: policyId } });
    if (!policy || policy.buyerId !== buyerId) throw new NotFoundException('Quote not found');
    if (policy.status !== InsuranceStatus.QUOTED)
      throw new BadRequestException('Quote already used');
    const updated = await this.prisma.insurancePolicy.update({
      where: { id: policyId },
      data: { status: InsuranceStatus.PURCHASED },
    });
    await this.prisma.referralCommission.create({
      data: {
        sourceType: CommissionSource.INSURANCE,
        sourceId: policy.id,
        partner: policy.partner,
        amount: Math.round(policy.premium * 0.15),
      },
    });
    return updated;
  }

  async openRcTransfer(userId: string, vehicleId: string) {
    const buyerId = await this.ensureBuyer(userId);
    const vehicle = await this.liveVehicle(vehicleId);
    const steps = RC_STEPS.map((key) => ({ key, done: false }));
    return this.prisma.rcTransferCase.create({
      data: {
        buyerId,
        vehicleId,
        dealerId: vehicle.dealerId,
        steps: steps as unknown as Prisma.InputJsonValue,
        status: RcTransferStatus.OPEN,
        fee: 1999,
      },
    });
  }

  /** Dealer advances the next pending RC step; completes when all done. */
  async advanceRcTransfer(userId: string, caseId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const rc = await this.prisma.rcTransferCase.findUnique({ where: { id: caseId } });
    if (!rc) throw new NotFoundException('Case not found');
    if (rc.dealerId !== dealer.id) throw new ForbiddenException('Not your case');

    const steps = (rc.steps as Array<{ key: string; done: boolean }>).map((s) => ({ ...s }));
    const next = steps.find((s) => !s.done);
    if (!next) throw new BadRequestException('All steps already complete');
    next.done = true;
    const allDone = steps.every((s) => s.done);

    const updated = await this.prisma.rcTransferCase.update({
      where: { id: caseId },
      data: {
        steps: steps as unknown as Prisma.InputJsonValue,
        status: allDone ? RcTransferStatus.COMPLETED : RcTransferStatus.IN_PROGRESS,
      },
    });
    if (allDone) {
      await this.prisma.referralCommission.create({
        data: {
          sourceType: CommissionSource.RC,
          sourceId: rc.id,
          partner: 'Mana RC Services',
          amount: rc.fee ?? 0,
        },
      });
    }
    return updated;
  }

  async listRcForDealer(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    return this.prisma.rcTransferCase.findMany({
      where: { dealerId: dealer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async referrals() {
    const [items, accrued] = await Promise.all([
      this.prisma.referralCommission.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
      this.prisma.referralCommission.aggregate({ _sum: { amount: true } }),
    ]);
    return { totalAccrued: accrued._sum.amount ?? 0, items };
  }
}
