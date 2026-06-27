import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus, SellStatus } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { estimateValuation } from '../vehicles/valuation';

export interface EstimateInput {
  regNumber?: string;
  make: string;
  model: string;
  manufactureYear: number;
  fuelType?: string;
  transmission?: string;
  odometerKm: number;
  ownersCount?: number;
  city?: string;
  condition?: string; // excellent | good | fair
  accidentDamage?: boolean;
}

// Condition nudges the offer band a little — sellers see it reflected.
const CONDITION_FACTOR: Record<string, number> = { excellent: 1.04, good: 1.0, fair: 0.93 };
const OFFER_DEALERS = [
  { dealerName: 'Crown Auto Hub', dealerTier: 'T3' },
  { dealerName: 'Apex Motors', dealerTier: 'T2' },
  { dealerName: 'CityDrive Cars', dealerTier: 'T2' },
  { dealerName: 'Highway Wheels', dealerTier: 'T1' },
];

@Injectable()
export class SellService {
  constructor(private readonly prisma: PrismaService) {}

  async estimate(userId: string, input: EstimateInput) {
    const band = estimateValuation({
      make: input.make,
      model: input.model,
      manufactureYear: input.manufactureYear,
      odometerKm: input.odometerKm,
    });
    const f = (input.condition && CONDITION_FACTOR[input.condition]) || 1;
    const dmg = input.accidentDamage ? 0.92 : 1;
    const fair = Math.round((band.fair * f * dmg) / 1000) * 1000;
    return this.prisma.sellRequest.create({
      data: {
        sellerUserId: userId,
        regNumber: input.regNumber ?? null,
        make: input.make,
        model: input.model,
        manufactureYear: input.manufactureYear,
        fuelType: input.fuelType ?? null,
        transmission: input.transmission ?? null,
        odometerKm: input.odometerKm,
        ownersCount: input.ownersCount ?? null,
        city: input.city ?? null,
        condition: input.condition ?? null,
        accidentDamage: input.accidentDamage ?? false,
        estLow: Math.round(fair * 0.92),
        estFair: fair,
        estHigh: Math.round(fair * 1.08),
        status: SellStatus.ESTIMATED,
      },
      include: { offers: true },
    });
  }

  private async owned(userId: string, id: string) {
    const sr = await this.prisma.sellRequest.findUnique({ where: { id } });
    if (!sr) throw new NotFoundException('Request not found');
    if (sr.sellerUserId !== userId) throw new ForbiddenException('Not your request');
    return sr;
  }

  /** Book the free doorstep inspection, then generate competitive dealer offers. */
  async bookInspection(userId: string, id: string, when?: string) {
    const sr = await this.owned(userId, id);
    const inspectionAt = when ? new Date(when) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(inspectionAt.getTime())) throw new BadRequestException('invalid date');

    // Generate offers around the fair estimate (real flow: dealers bid post-inspection).
    const spread = [1.02, 0.98, 0.95, 1.0];
    await this.prisma.dealerOffer.deleteMany({ where: { sellRequestId: id } });
    await this.prisma.dealerOffer.createMany({
      data: OFFER_DEALERS.slice(0, 3).map((d, i) => ({
        sellRequestId: id,
        dealerName: d.dealerName,
        dealerTier: d.dealerTier,
        amount: Math.round((sr.estFair * (spread[i] ?? 1)) / 1000) * 1000,
      })),
    });
    await this.prisma.sellRequest.update({
      where: { id },
      data: { status: SellStatus.OFFERS_READY, inspectionAt },
    });
    return this.get(userId, id);
  }

  async acceptOffer(userId: string, id: string, offerId: string) {
    await this.owned(userId, id);
    const offer = await this.prisma.dealerOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.sellRequestId !== id) throw new NotFoundException('Offer not found');
    await this.prisma.$transaction([
      this.prisma.dealerOffer.update({
        where: { id: offerId },
        data: { status: OfferStatus.ACCEPTED },
      }),
      this.prisma.dealerOffer.updateMany({
        where: { sellRequestId: id, id: { not: offerId } },
        data: { status: OfferStatus.DECLINED },
      }),
      this.prisma.sellRequest.update({ where: { id }, data: { status: SellStatus.ACCEPTED } }),
    ]);
    return this.get(userId, id);
  }

  /** Seller counters an offer; the dealer meets roughly halfway and re-opens it. */
  async renegotiateOffer(
    userId: string,
    id: string,
    offerId: string,
    counterAmount: number,
    comment?: string,
  ) {
    await this.owned(userId, id);
    const offer = await this.prisma.dealerOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.sellRequestId !== id) throw new NotFoundException('Offer not found');
    if (counterAmount <= offer.amount) {
      throw new BadRequestException('Counter must be higher than the current offer');
    }
    const revised = Math.min(
      counterAmount,
      Math.round((offer.amount + counterAmount) / 2000) * 1000,
    );
    await this.prisma.dealerOffer.update({
      where: { id: offerId },
      data: {
        amount: revised,
        counterAmount,
        sellerComment: comment ?? null,
        dealerComment: `Revised after your counter of ₹${counterAmount.toLocaleString('en-IN')}.`,
        status: OfferStatus.OPEN,
      },
    });
    return this.get(userId, id);
  }

  async rejectOffer(userId: string, id: string, offerId: string, comment?: string) {
    await this.owned(userId, id);
    const offer = await this.prisma.dealerOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.sellRequestId !== id) throw new NotFoundException('Offer not found');
    await this.prisma.dealerOffer.update({
      where: { id: offerId },
      data: { status: OfferStatus.REJECTED, sellerComment: comment ?? null },
    });
    return this.get(userId, id);
  }

  async get(userId: string, id: string) {
    await this.owned(userId, id);
    return this.prisma.sellRequest.findUnique({
      where: { id },
      include: { offers: { orderBy: { amount: 'desc' } } },
    });
  }

  async listMine(userId: string) {
    return this.prisma.sellRequest.findMany({
      where: { sellerUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { offers: true },
    });
  }
}
