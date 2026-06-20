import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CertificationTier,
  FraudRisk,
  InspectionJobStatus,
  InspectionType,
  Prisma,
  UserRole,
  type Vehicle,
} from '@mana/db';
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

  // ─── Inspector job workflow (physical inspections) ──────────

  /** Dealer requests a physical inspection of one of their vehicles. */
  async requestPhysical(
    userId: string,
    vehicleId: string,
    opts: { scheduledAt?: string; location?: string; notes?: string } = {},
  ) {
    await this.ownedVehicle(userId, vehicleId);
    return this.prisma.inspectionJob.create({
      data: {
        vehicleId,
        requestedByUserId: userId,
        scheduledAt: opts.scheduledAt ? new Date(opts.scheduledAt) : null,
        location: opts.location ?? null,
        notes: opts.notes ?? null,
      },
    });
  }

  /** Admin assigns a requested job to an inspector. */
  async assign(jobId: string, inspectorId: string, scheduledAt?: string) {
    const inspector = await this.prisma.user.findUnique({ where: { id: inspectorId } });
    if (!inspector || inspector.role !== UserRole.INSPECTOR) {
      throw new BadRequestException('Target user is not an inspector');
    }
    const job = await this.prisma.inspectionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === InspectionJobStatus.COMPLETED) {
      throw new BadRequestException('Job already completed');
    }
    return this.prisma.inspectionJob.update({
      where: { id: jobId },
      data: {
        assignedInspectorId: inspectorId,
        status: InspectionJobStatus.ASSIGNED,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : job.scheduledAt,
      },
    });
  }

  listJobsForAdmin(status?: InspectionJobStatus) {
    return this.prisma.inspectionJob.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: { vehicle: { select: { regNumber: true, make: true, model: true } } },
      take: 200,
    });
  }

  /** An inspector's worklist — drives the offline-capable field app. */
  listJobsForInspector(inspectorId: string, status?: InspectionJobStatus) {
    return this.prisma.inspectionJob.findMany({
      where: { assignedInspectorId: inspectorId, ...(status ? { status } : {}) },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      include: {
        vehicle: {
          select: { id: true, regNumber: true, make: true, model: true, manufactureYear: true },
        },
      },
    });
  }

  private async ownedJob(inspectorId: string, jobId: string) {
    const job = await this.prisma.inspectionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.assignedInspectorId !== inspectorId) throw new ForbiddenException('Not your job');
    return job;
  }

  async startJob(inspectorId: string, jobId: string) {
    const job = await this.ownedJob(inspectorId, jobId);
    if (job.status === InspectionJobStatus.COMPLETED) return job;
    return this.prisma.inspectionJob.update({
      where: { id: jobId },
      data: { status: InspectionJobStatus.IN_PROGRESS, startedAt: job.startedAt ?? new Date() },
    });
  }

  /**
   * Inspector submits a completed physical inspection. Idempotent on clientRef so
   * the offline app can safely retry a queued submission after losing connectivity.
   */
  async submitPhysical(
    inspectorId: string,
    jobId: string,
    input: {
      sectionScores: Record<string, number>;
      odometerKm?: number;
      notes?: string;
      clientRef?: string;
    },
  ) {
    const job = await this.ownedJob(inspectorId, jobId);

    // Idempotent replay: a job already completed with the same clientRef returns as-is.
    if (job.status === InspectionJobStatus.COMPLETED && job.inspectionId) {
      if (!input.clientRef || job.clientRef === input.clientRef) {
        const inspection = await this.prisma.inspection.findUnique({
          where: { id: job.inspectionId },
        });
        return { job, inspection, replayed: true };
      }
      throw new BadRequestException('Job already completed');
    }
    if (input.clientRef) {
      const dup = await this.prisma.inspectionJob.findUnique({
        where: { clientRef: input.clientRef },
      });
      if (dup && dup.id !== jobId) throw new BadRequestException('Duplicate clientRef');
    }
    if (!input.sectionScores || Object.keys(input.sectionScores).length === 0) {
      throw new BadRequestException('sectionScores required');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: job.vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const { overall, grade } = scoreInspection(input.sectionScores);
    const inspection = await this.prisma.inspection.create({
      data: {
        vehicleId: job.vehicleId,
        type: InspectionType.PHYSICAL,
        overallScore: overall,
        grade,
        sectionScores: input.sectionScores as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    // Record an odometer reading taken in the field (compared to the declared value).
    const declaredKm = input.odometerKm ?? vehicle.odometerKm ?? 0;
    const odo = assessOdometer({ declaredKm, manufactureYear: vehicle.manufactureYear });
    await this.prisma.odometerCheck.create({
      data: {
        vehicleId: job.vehicleId,
        declaredKm,
        estimatedKm: odo.estimatedKm,
        fraudRisk: odo.fraudRisk as FraudRisk,
        signals: odo.signals as unknown as Prisma.InputJsonValue,
      },
    });

    const updatedJob = await this.prisma.inspectionJob.update({
      where: { id: jobId },
      data: {
        status: InspectionJobStatus.COMPLETED,
        inspectionId: inspection.id,
        completedAt: new Date(),
        notes: input.notes ?? job.notes,
        clientRef: input.clientRef ?? job.clientRef,
      },
    });

    await this.recertify(job.vehicleId);
    return { job: updatedJob, inspection, replayed: false };
  }

  /**
   * Full vehicle-history report — the buyer-facing trust dossier aggregating RC
   * verification, ownership, every inspection, odometer-fraud signals and the
   * current certification tier.
   */
  async vehicleHistory(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        verification: true,
        inspections: { orderBy: { createdAt: 'desc' } },
        odometerChecks: { orderBy: { checkedAt: 'desc' } },
        certification: true,
        inspectionJobs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const latestOdo = vehicle.odometerChecks[0];
    const physical = vehicle.inspections.find((i) => i.type === InspectionType.PHYSICAL);
    const v = vehicle.verification;
    const flags: string[] = [];
    if (latestOdo?.fraudRisk === FraudRisk.HIGH) flags.push('Odometer rollback suspected');
    if (!v?.verifiedAt) flags.push('RC not verified against VAHAN');
    if (!physical) flags.push('No physical inspection on record');
    if (v?.hypothecationActive)
      flags.push(`Active loan/hypothecation (${v.financerName ?? 'lender'})`);
    if (v?.challanCount && v.challanCount > 0) flags.push(`${v.challanCount} pending challan(s)`);

    return {
      vehicle: {
        id: vehicle.id,
        regNumber: vehicle.regNumber,
        make: vehicle.make,
        model: vehicle.model,
        manufactureYear: vehicle.manufactureYear,
        odometerKm: vehicle.odometerKm,
      },
      registration: v
        ? {
            ownerName: v.rcOwnerName,
            status: v.rcStatus,
            verifiedAt: v.verifiedAt,
            source: v.source,
            insuranceValidTill: v.insuranceValidTill,
            insuranceProvider: v.insuranceProvider,
            pucValidTill: v.pucValidTill,
            hypothecationActive: v.hypothecationActive,
            challanCount: v.challanCount,
          }
        : null,
      certification: vehicle.certification,
      inspections: vehicle.inspections,
      odometer: latestOdo ?? null,
      trustFlags: flags,
      reportGeneratedFor: vehicle.id,
    };
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
