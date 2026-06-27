import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadIntent, Prisma, VehicleStatus } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BuyersService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureBuyer(userId: string): Promise<string> {
    const buyer = await this.prisma.buyer.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return buyer.id;
  }

  async createLead(userId: string, vehicleId: string, intent: LeadIntent, note?: string) {
    const buyerId = await this.ensureBuyer(userId);
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle || vehicle.status !== VehicleStatus.LIVE) {
      throw new NotFoundException('Listing not available');
    }
    return this.prisma.lead.create({
      data: { buyerId, vehicleId, dealerId: vehicle.dealerId, intent, note: note ?? null },
    });
  }

  async listLeads(userId: string) {
    const buyerId = await this.ensureBuyer(userId);
    return this.prisma.lead.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, make: true, model: true, price: true, status: true } },
      },
    });
  }

  async addWishlist(userId: string, vehicleId: string) {
    const buyerId = await this.ensureBuyer(userId);
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return this.prisma.wishlist.upsert({
      where: { buyerId_vehicleId: { buyerId, vehicleId } },
      update: {},
      create: { buyerId, vehicleId },
    });
  }

  async removeWishlist(userId: string, vehicleId: string) {
    const buyerId = await this.ensureBuyer(userId);
    await this.prisma.wishlist.deleteMany({ where: { buyerId, vehicleId } });
    return { removed: true };
  }

  async listWishlist(userId: string) {
    const buyerId = await this.ensureBuyer(userId);
    return this.prisma.wishlist.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: {
          include: { media: { orderBy: { position: 'asc' }, take: 1 } },
        },
      },
    });
  }

  async createSavedSearch(userId: string, query: Record<string, unknown>, alertChannel: string) {
    const buyerId = await this.ensureBuyer(userId);
    if (!query || Object.keys(query).length === 0) {
      throw new BadRequestException('Saved search query cannot be empty');
    }
    return this.prisma.savedSearch.create({
      data: { buyerId, query: query as Prisma.InputJsonValue, alertChannel },
    });
  }

  async listSavedSearches(userId: string) {
    const buyerId = await this.ensureBuyer(userId);
    return this.prisma.savedSearch.findMany({ where: { buyerId }, orderBy: { createdAt: 'desc' } });
  }

  async deleteSavedSearch(userId: string, id: string) {
    const buyerId = await this.ensureBuyer(userId);
    await this.prisma.savedSearch.deleteMany({ where: { id, buyerId } });
    return { removed: true };
  }

  async me(userId: string) {
    const buyerId = await this.ensureBuyer(userId);
    const [leads, wishlist, savedSearches] = await Promise.all([
      this.prisma.lead.count({ where: { buyerId } }),
      this.prisma.wishlist.count({ where: { buyerId } }),
      this.prisma.savedSearch.count({ where: { buyerId } }),
    ]);
    return { buyerId, counts: { leads, wishlist, savedSearches } };
  }

  // ─── Pro Buyer subscription (Razorpay key-ready; mock until keys) ────────
  private async isPro(userId: string): Promise<boolean> {
    const sub = await this.prisma.buyerSubscription.findUnique({ where: { userId } });
    return (
      !!sub &&
      sub.status === 'ACTIVE' &&
      (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date())
    );
  }

  getSubscription(userId: string) {
    return this.prisma.buyerSubscription.findUnique({ where: { userId } });
  }

  async subscribePro(userId: string) {
    // TODO(payments): create a Razorpay order; on webhook success, activate.
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return this.prisma.buyerSubscription.upsert({
      where: { userId },
      update: { status: 'ACTIVE', currentPeriodEnd: periodEnd },
      create: { userId, plan: 'PRO', status: 'ACTIVE', currentPeriodEnd: periodEnd },
    });
  }

  async cancelPro(userId: string) {
    return this.prisma.buyerSubscription.update({
      where: { userId },
      data: { status: 'CANCELLED' },
    });
  }

  // ─── Paid vehicle-history reports (free for Pro) ────────────────────────
  async purchaseReport(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    const pro = await this.isPro(userId);
    return this.prisma.reportPurchase.upsert({
      where: { userId_vehicleId: { userId, vehicleId } },
      update: { status: 'PAID' },
      create: { userId, vehicleId, amount: pro ? 0 : 199, status: 'PAID' },
    });
  }

  listReports(userId: string) {
    return this.prisma.reportPurchase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, make: true, model: true, manufactureYear: true } },
      },
    });
  }

  async reportAccess(userId: string, vehicleId: string) {
    const [pro, purchased] = await Promise.all([
      this.isPro(userId),
      this.prisma.reportPurchase.findUnique({ where: { userId_vehicleId: { userId, vehicleId } } }),
    ]);
    return { unlocked: pro || !!purchased, pro };
  }

  /** Buyer account dashboard: subscription + reports + bookings tracker. */
  async account(userId: string) {
    const buyerId = await this.ensureBuyer(userId);
    const [subscription, reports, savedSearches, leads, appointments, finance, sells] =
      await Promise.all([
        this.prisma.buyerSubscription.findUnique({ where: { userId } }),
        this.listReports(userId),
        this.prisma.savedSearch.findMany({ where: { buyerId }, orderBy: { createdAt: 'desc' } }),
        this.prisma.lead.findMany({
          where: { buyerId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { vehicle: { select: { make: true, model: true } } },
        }),
        this.prisma.appointment.findMany({
          where: { buyerId },
          orderBy: { scheduledStart: 'desc' },
          take: 20,
          include: { vehicle: { select: { make: true, model: true } } },
        }),
        this.prisma.financeApplication.findMany({
          where: { buyerId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { vehicle: { select: { make: true, model: true } } },
        }),
        this.prisma.sellRequest.findMany({
          where: { sellerUserId: userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);
    return { subscription, reports, savedSearches, leads, appointments, finance, sells };
  }
}
