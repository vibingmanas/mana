import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CertificationTier, FraudRisk, InspectionType, Prisma, type Vehicle } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { DealersService } from '../dealers/dealers.service';
import { assessOdometer } from './odometer';
import { mockAiSectionScores, scoreInspection } from './inspection-score';

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealers: DealersService,
  ) {}

  private async ownedVehicle(userId: string, vehicleId: string): Promise<Vehicle> {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.dealerId !== dealer.id) throw new ForbiddenException('Not your vehicle');
    return vehicle;
  }

  private ageOf(v: Vehicle): number {
    const year = v.manufactureYear ?? new Date().getFullYear();
    return Math.max(0, new Date().getFullYear() - year);
  }

  async runOdometerCheck(userId: string, vehicleId: string) {
    const vehicle = await this.ownedVehicle(userId, vehicleId);
    const result = assessOdometer({
      declaredKm: vehicle.odometerKm ?? 0,
      manufactureYear: vehicle.manufactureYear,
    });
    const row = await this.prisma.odometerCheck.create({
      data: {
        vehicleId,
        declaredKm: vehicle.odometerKm ?? 0,
        estimatedKm: result.estimatedKm,
        fraudRisk: result.fraudRisk as FraudRisk,
        signals: result.signals as unknown as Prisma.InputJsonValue,
      },
    });
    return row;
  }

  async runInspection(
    userId: string,
    vehicleId: string,
    type: InspectionType,
    sectionScores?: Record<string, number>,
  ) {
    const vehicle = await this.ownedVehicle(userId, vehicleId);
    let scores = sectionScores;
    if (type === InspectionType.AI_PHOTO) {
      scores = mockAiSectionScores(this.ageOf(vehicle));
    }
    if (!scores || Object.keys(scores).length === 0) {
      throw new BadRequestException('sectionScores required for this inspection type');
    }
    const { overall, grade } = scoreInspection(scores);
    const inspection = await this.prisma.inspection.create({
      data: {
        vehicleId,
        type,
        overallScore: overall,
        grade,
        sectionScores: scores as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    await this.recertify(vehicleId);
    return inspection;
  }

  /** Derive certification tier from best inspection + odometer risk (admin grants MANA_CERTIFIED). */
  private async recertify(vehicleId: string) {
    const [inspections, latestOdo] = await Promise.all([
      this.prisma.inspection.findMany({ where: { vehicleId } }),
      this.prisma.odometerCheck.findFirst({ where: { vehicleId }, orderBy: { checkedAt: 'desc' } }),
    ]);
    const hasPhysical = inspections.some((i) => i.type === InspectionType.PHYSICAL);
    const hasAi = inspections.some((i) => i.type === InspectionType.AI_PHOTO);
    const odoHigh = latestOdo?.fraudRisk === FraudRisk.HIGH;

    let tier: CertificationTier = CertificationTier.SELF_DECLARED;
    if (!odoHigh && hasPhysical) tier = CertificationTier.MANA_INSPECTED;
    else if (!odoHigh && hasAi) tier = CertificationTier.AI_CHECKED;

    await this.prisma.certification.upsert({
      where: { vehicleId },
      create: {
        vehicleId,
        tier,
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
      update: {
        tier,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
    });
  }

  /** Public: trust summary for a vehicle. */
  async getForVehicle(vehicleId: string) {
    const [inspection, odometer, certification] = await Promise.all([
      this.prisma.inspection.findFirst({ where: { vehicleId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.odometerCheck.findFirst({ where: { vehicleId }, orderBy: { checkedAt: 'desc' } }),
      this.prisma.certification.findUnique({ where: { vehicleId } }),
    ]);
    return { inspection, odometer, certification };
  }
}
