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
}
