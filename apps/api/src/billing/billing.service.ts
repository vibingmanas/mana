import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma, SubscriptionStatus } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { DealersService } from '../dealers/dealers.service';
import { DEFAULT_PLANS, STARTER_LISTING_LIMIT, gstBreakup } from './billing-rules';

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealers: DealersService,
  ) {}

  /** Idempotently seed the default plans (so the feature works without a manual seed). */
  async ensurePlans() {
    for (const p of DEFAULT_PLANS) {
      await this.prisma.subscriptionPlan.upsert({
        where: { key: p.key },
        update: {
          name: p.name,
          priceMonthly: p.priceMonthly,
          listingLimit: p.listingLimit,
          leadLimit: p.leadLimit,
          features: p.features as unknown as Prisma.InputJsonValue,
        },
        create: {
          key: p.key,
          name: p.name,
          priceMonthly: p.priceMonthly,
          listingLimit: p.listingLimit,
          leadLimit: p.leadLimit,
          features: p.features as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  async listPlans() {
    await this.ensurePlans();
    return this.prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  /** Effective live-listing limit for a dealer (subscription plan, else Starter). */
  async listingLimitForDealer(dealerId: string): Promise<number> {
    const sub = await this.prisma.subscription.findUnique({
      where: { dealerId },
      include: { plan: true },
    });
    if (sub && sub.status === SubscriptionStatus.ACTIVE) return sub.plan.listingLimit;
    return STARTER_LISTING_LIMIT;
  }

  async subscribe(userId: string, planKey: string) {
    await this.ensurePlans();
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { key: planKey } });
    if (!plan) throw new NotFoundException('Plan not found');

    const now = new Date();
    const end = new Date(now.getTime() + PERIOD_MS);
    const sub = await this.prisma.subscription.upsert({
      where: { dealerId: dealer.id },
      update: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: end,
      },
      create: {
        dealerId: dealer.id,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: end,
      },
      include: { plan: true },
    });

    // Mock payment: paid plans generate a GST invoice immediately.
    if (plan.priceMonthly > 0) {
      const { base, gst } = gstBreakup(plan.priceMonthly);
      await this.prisma.invoice.create({
        data: {
          dealerId: dealer.id,
          amount: base,
          gstAmount: gst,
          status: InvoiceStatus.PAID,
          periodStart: now,
          periodEnd: end,
        },
      });
    }
    return sub;
  }

  async mySubscription(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const sub = await this.prisma.subscription.findUnique({
      where: { dealerId: dealer.id },
      include: { plan: true },
    });
    const limit = await this.listingLimitForDealer(dealer.id);
    const liveListings = await this.prisma.vehicle.count({
      where: { dealerId: dealer.id, status: 'LIVE' },
    });
    return { subscription: sub, plan: sub?.plan ?? null, listingLimit: limit, liveListings };
  }

  async invoices(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    return this.prisma.invoice.findMany({
      where: { dealerId: dealer.id },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async cancel(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const sub = await this.prisma.subscription.findUnique({ where: { dealerId: dealer.id } });
    if (!sub) throw new BadRequestException('No active subscription');
    return this.prisma.subscription.update({
      where: { dealerId: dealer.id },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }

  /** Admin: monthly recurring revenue + counts. */
  async revenue() {
    const active = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    });
    const mrr = active.reduce((sum, s) => sum + s.plan.priceMonthly, 0);
    const byPlan: Record<string, number> = {};
    for (const s of active) byPlan[s.plan.key] = (byPlan[s.plan.key] ?? 0) + 1;
    const invoiced = await this.prisma.invoice.aggregate({
      _sum: { amount: true, gstAmount: true },
    });
    return {
      mrr,
      activeSubscriptions: active.length,
      subscribersByPlan: byPlan,
      totalInvoiced: (invoiced._sum.amount ?? 0) + (invoiced._sum.gstAmount ?? 0),
    };
  }
}
