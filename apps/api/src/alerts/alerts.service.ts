import { Injectable, Logger } from '@nestjs/common';
import { VehicleStatus } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { dealScore } from '../vehicles/valuation';
import { savedSearchMatches, type SearchQuery } from './match';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Create an in-app notification and fan out to email (best-effort). WhatsApp/push
   *  channels reuse the same hook once their providers are configured (key-ready). */
  private async notify(
    userId: string,
    type: string,
    title: string,
    body: string,
    vehicleId: string,
  ) {
    await this.prisma.notification.create({ data: { userId, type, title, body, vehicleId } });
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (user?.email) await this.email.sendAlert(user.email, title, body);
    } catch (e) {
      this.logger.warn(`Alert email failed for ${userId}: ${(e as Error).message}`);
    }
  }

  /** Record price history and, on a drop for a LIVE car, notify interested buyers. */
  async onPriceChange(vehicleId: string, oldPrice: number | null, newPrice: number) {
    await this.prisma.priceHistory.create({ data: { vehicleId, price: newPrice } });

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return;

    // Keep dealScore consistent with the new price.
    if (vehicle.valuationFair) {
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { dealScore: dealScore(newPrice, vehicle.valuationFair) },
      });
    }

    const dropped = oldPrice != null && newPrice < oldPrice;
    if (!dropped || vehicle.status !== VehicleStatus.LIVE) return;

    const label = `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || 'A car';
    const notifiedUserIds = new Set<string>();

    // 1. Wishlist price-drop.
    const wishes = await this.prisma.wishlist.findMany({
      where: { vehicleId },
      include: { buyer: { select: { userId: true } } },
    });
    for (const w of wishes) {
      const userId = w.buyer.userId;
      if (notifiedUserIds.has(userId)) continue;
      notifiedUserIds.add(userId);
      await this.notify(
        userId,
        'price_drop',
        'Price dropped on a saved car',
        `${label} is now ₹${newPrice.toLocaleString('en-IN')} (was ₹${oldPrice!.toLocaleString('en-IN')}).`,
        vehicleId,
      );
    }

    // 2. Saved-search matches.
    const searches = await this.prisma.savedSearch.findMany({
      include: { buyer: { select: { userId: true } } },
    });
    for (const s of searches) {
      const userId = s.buyer.userId;
      if (notifiedUserIds.has(userId)) continue;
      if (!savedSearchMatches(s.query as SearchQuery, vehicle)) continue;
      notifiedUserIds.add(userId);
      await this.notify(
        userId,
        'saved_search_match',
        'A car matching your search dropped in price',
        `${label} is now ₹${newPrice.toLocaleString('en-IN')}.`,
        vehicleId,
      );
    }
    this.logger.log(`Price drop on ${vehicleId}: notified ${notifiedUserIds.size} buyer(s)`);
  }

  async list(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { unread, items };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
    return { ok: true };
  }
}
