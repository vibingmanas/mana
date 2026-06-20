import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommissionSource,
  DrawdownStatus,
  FinanceStatus,
  FloorPlanStatus,
  InsuranceStatus,
  Prisma,
  RcTransferStatus,
  VehicleStatus,
} from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { DealersService } from '../dealers/dealers.service';
import { computeEmi } from './emi';
import { LenderService } from './lender.service';
import { ESignService } from './esign.service';

const RC_STEPS = ['form29', 'form30', 'noc', 'insurance_transfer'] as const;
const DRAWDOWN_TERM_DAYS = 90;

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealers: DealersService,
    private readonly lender: LenderService,
    private readonly esign: ESignService,
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
    const decision = await this.lender.underwriteConsumer({ amount, downPayment, tenureMonths });

    const app = await this.prisma.financeApplication.create({
      data: {
        buyerId,
        vehicleId,
        dealerId: vehicle.dealerId,
        amount,
        downPayment,
        tenureMonths,
        partner: decision.partner,
        partnerRef: decision.partnerRef,
        status: decision.approved ? FinanceStatus.APPROVED : FinanceStatus.REJECTED,
      },
    });
    // Referral commission accrues on disbursement (after eSign), not at approval.
    return { ...app, decisionReason: decision.reason };
  }

  private async ownedApplication(userId: string, appId: string) {
    const buyerId = await this.ensureBuyer(userId);
    const app = await this.prisma.financeApplication.findUnique({ where: { id: appId } });
    if (!app || app.buyerId !== buyerId) throw new NotFoundException('Application not found');
    return app;
  }

  /** Buyer e-signs the loan agreement for an approved application. */
  async esignInitiate(userId: string, appId: string) {
    const app = await this.ownedApplication(userId, appId);
    if (app.status !== FinanceStatus.APPROVED) {
      throw new BadRequestException('Only approved applications can be signed');
    }
    const req = await this.esign.createRequest({
      applicationId: app.id,
      documentTitle: 'Mana auto-loan agreement',
    });
    await this.prisma.financeApplication.update({
      where: { id: app.id },
      data: { esignRef: req.ref, esignStatus: 'PENDING' },
    });
    return { signUrl: req.signUrl, ref: req.ref, live: this.esign.isLive() };
  }

  /** Confirm the eSign callback → disburse and accrue the referral commission. */
  async esignComplete(userId: string, appId: string, ref: string) {
    const app = await this.ownedApplication(userId, appId);
    if (app.status === FinanceStatus.DISBURSED) return app;
    if (app.status !== FinanceStatus.APPROVED) {
      throw new BadRequestException('Application is not awaiting signature');
    }
    const signed = await this.esign.confirm(app.id, ref);
    if (!signed) throw new BadRequestException('Signature not completed');

    const updated = await this.prisma.financeApplication.update({
      where: { id: app.id },
      data: {
        esignStatus: 'SIGNED',
        signedAt: new Date(),
        status: FinanceStatus.DISBURSED,
      },
    });
    await this.prisma.referralCommission.create({
      data: {
        sourceType: CommissionSource.FINANCE,
        sourceId: app.id,
        partner: app.partner ?? 'Partner Lender',
        amount: Math.round((app.amount - app.downPayment) * 0.01), // 1% referral
      },
    });
    return updated;
  }

  // ─── Dealer floor-plan (inventory) financing ───────────────────────────

  async requestFloorPlan(userId: string, requestedLimit: number) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const decision = await this.lender.underwriteFloorPlan({ requestedLimit });
    return this.prisma.floorPlanFacility.upsert({
      where: { dealerId: dealer.id },
      update: {
        lender: decision.lender,
        creditLimit: decision.creditLimit,
        interestApr: decision.interestApr,
        partnerRef: decision.partnerRef,
        status: decision.approved ? FloorPlanStatus.ACTIVE : FloorPlanStatus.SUSPENDED,
      },
      create: {
        dealerId: dealer.id,
        lender: decision.lender,
        creditLimit: decision.creditLimit,
        interestApr: decision.interestApr,
        partnerRef: decision.partnerRef,
        status: decision.approved ? FloorPlanStatus.ACTIVE : FloorPlanStatus.SUSPENDED,
      },
    });
  }

  async floorPlanSummary(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const facility = await this.prisma.floorPlanFacility.findUnique({
      where: { dealerId: dealer.id },
      include: { drawdowns: { orderBy: { drawnAt: 'desc' } } },
    });
    if (!facility) return null;
    return { ...facility, available: facility.creditLimit - facility.outstanding };
  }

  /** Draw down against the facility to fund a vehicle in stock. */
  async drawdown(userId: string, vehicleId: string, principal: number) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const facility = await this.prisma.floorPlanFacility.findUnique({
      where: { dealerId: dealer.id },
    });
    if (!facility || facility.status !== FloorPlanStatus.ACTIVE) {
      throw new BadRequestException('No active floor-plan facility');
    }
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle || vehicle.dealerId !== dealer.id)
      throw new ForbiddenException('Not your vehicle');
    const available = facility.creditLimit - facility.outstanding;
    if (principal <= 0 || principal > available) {
      throw new BadRequestException(`Drawdown exceeds available credit (₹${available})`);
    }
    const [drawdown] = await this.prisma.$transaction([
      this.prisma.floorPlanDrawdown.create({
        data: {
          facilityId: facility.id,
          vehicleId,
          principal,
          dueAt: new Date(Date.now() + DRAWDOWN_TERM_DAYS * 86_400_000),
        },
      }),
      this.prisma.floorPlanFacility.update({
        where: { id: facility.id },
        data: { outstanding: { increment: principal } },
      }),
    ]);
    return drawdown;
  }

  /** Repay a drawdown (on sale); accrues simple interest for the holding period. */
  async repayDrawdown(userId: string, drawdownId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const drawdown = await this.prisma.floorPlanDrawdown.findUnique({
      where: { id: drawdownId },
      include: { facility: true },
    });
    if (!drawdown || drawdown.facility.dealerId !== dealer.id) {
      throw new NotFoundException('Drawdown not found');
    }
    if (drawdown.status === DrawdownStatus.REPAID) {
      throw new BadRequestException('Already repaid');
    }
    const days = Math.max(1, Math.round((Date.now() - drawdown.drawnAt.getTime()) / 86_400_000));
    const interest = Math.round(
      (drawdown.principal * drawdown.facility.interestApr * days) / (100 * 365),
    );
    const [updated] = await this.prisma.$transaction([
      this.prisma.floorPlanDrawdown.update({
        where: { id: drawdown.id },
        data: { status: DrawdownStatus.REPAID, repaidAt: new Date(), interestAccrued: interest },
      }),
      this.prisma.floorPlanFacility.update({
        where: { id: drawdown.facilityId },
        data: { outstanding: { decrement: drawdown.principal } },
      }),
    ]);
    return { ...updated, interestCharged: interest };
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
