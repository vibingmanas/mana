import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DealerStatus, VehicleStatus, VerificationTier } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

interface ActorMeta {
  actorUserId: string;
  ip?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async dashboard() {
    const [dealers, vehicles, leads, users, appts] = await Promise.all([
      this.prisma.dealer.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.vehicle.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.lead.count(),
      this.prisma.user.count(),
      this.prisma.appointment.count(),
    ]);
    return {
      dealersByStatus: Object.fromEntries(dealers.map((d) => [d.status, d._count._all])),
      vehiclesByStatus: Object.fromEntries(vehicles.map((v) => [v.status, v._count._all])),
      totalLeads: leads,
      totalUsers: users,
      totalAppointments: appts,
    };
  }

  async listDealers(status?: DealerStatus) {
    return this.prisma.dealer.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        legalName: true,
        city: true,
        state: true,
        status: true,
        verificationTier: true,
        createdAt: true,
      },
    });
  }

  /** Dealer 360 — sensitive KYC is returned masked only (no Aadhaar number/token). */
  async getDealer(id: string) {
    const dealer = await this.prisma.dealer.findUnique({
      where: { id },
      include: {
        kyc: true,
        _count: { select: { vehicles: true, leads: true } },
      },
    });
    if (!dealer) throw new NotFoundException('Dealer not found');
    const k = dealer.kyc;
    return {
      id: dealer.id,
      displayName: dealer.displayName,
      legalName: dealer.legalName,
      ownerName: dealer.ownerName,
      city: dealer.city,
      state: dealer.state,
      status: dealer.status,
      verificationTier: dealer.verificationTier,
      counts: dealer._count,
      kyc: k
        ? {
            emailVerifiedAt: k.emailVerifiedAt,
            phoneVerifiedAt: k.phoneVerifiedAt,
            aadhaarVerifiedAt: k.aadhaarVerifiedAt,
            aadhaarNameMasked: k.aadhaarNameMasked, // already masked
            panVerifiedAt: k.panVerifiedAt,
            pan: k.pan, // PAN is shown to ops; Aadhaar is never
            gstin: k.gstin,
            gstVerifiedAt: k.gstVerifiedAt,
            bankVerifiedAt: k.bankVerifiedAt,
            bankAccountRef: k.bankAccountRef, // masked ref only
          }
        : null,
    };
  }

  async setDealerTier(id: string, tier: VerificationTier, reason: string, meta: ActorMeta) {
    const dealer = await this.prisma.dealer.findUnique({ where: { id } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    const updated = await this.prisma.dealer.update({
      where: { id },
      data: { verificationTier: tier },
    });
    await this.audit.record({
      actorUserId: meta.actorUserId,
      action: 'dealer.tier.override',
      entityType: 'dealer',
      entityId: id,
      before: { verificationTier: dealer.verificationTier },
      after: { verificationTier: tier },
      reason,
      ip: meta.ip,
    });
    return { id: updated.id, verificationTier: updated.verificationTier };
  }

  async setDealerStatus(id: string, status: DealerStatus, reason: string, meta: ActorMeta) {
    const dealer = await this.prisma.dealer.findUnique({ where: { id } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    const updated = await this.prisma.dealer.update({ where: { id }, data: { status } });
    await this.audit.record({
      actorUserId: meta.actorUserId,
      action: 'dealer.status.change',
      entityType: 'dealer',
      entityId: id,
      before: { status: dealer.status },
      after: { status },
      reason,
      ip: meta.ip,
    });
    return { id: updated.id, status: updated.status };
  }

  async moderateListing(
    id: string,
    action: 'hold' | 'remove' | 'approve',
    reason: string,
    meta: ActorMeta,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    const map: Record<string, VehicleStatus> = {
      hold: VehicleStatus.PAUSED,
      remove: VehicleStatus.REMOVED,
      approve: VehicleStatus.LIVE,
    };
    const next = map[action];
    if (!next) throw new BadRequestException('Invalid action');
    if (action === 'approve' && !vehicle.listedAt) {
      throw new BadRequestException('Cannot approve a listing that was never published');
    }
    const updated = await this.prisma.vehicle.update({ where: { id }, data: { status: next } });
    await this.audit.record({
      actorUserId: meta.actorUserId,
      action: `listing.${action}`,
      entityType: 'vehicle',
      entityId: id,
      before: { status: vehicle.status },
      after: { status: next },
      reason,
      ip: meta.ip,
    });
    return { id: updated.id, status: updated.status };
  }

  async auditLog(limit = 100) {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
  }
}
