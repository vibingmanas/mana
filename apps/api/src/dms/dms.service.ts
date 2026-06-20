import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, LeadStatus, VehicleStatus } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';
import { DealersService } from '../dealers/dealers.service';
import { countByStage } from './pipeline';

@Injectable()
export class DmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealers: DealersService,
  ) {}

  async listLeads(userId: string, status?: LeadStatus) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const leads = await this.prisma.lead.findMany({
      where: { dealerId: dealer.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, make: true, model: true, regNumber: true, price: true } },
        buyer: { include: { user: { select: { phone: true, name: true } } } },
      },
    });
    return { pipeline: countByStage(leads), leads };
  }

  async updateLead(userId: string, leadId: string, data: { status?: LeadStatus; note?: string }) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.dealerId !== dealer.id) throw new ForbiddenException('Not your lead');
    return this.prisma.lead.update({
      where: { id: leadId },
      data: { status: data.status ?? lead.status, note: data.note ?? lead.note },
    });
  }

  async dashboard(userId: string) {
    const dealer = await this.dealers.getByUserOrThrow(userId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [stockGroups, leadGroups, liveCount, upcoming, salesThisMonth, newLeads] =
      await Promise.all([
        this.prisma.vehicle.groupBy({
          by: ['status'],
          where: { dealerId: dealer.id },
          _count: { _all: true },
        }),
        this.prisma.lead.groupBy({
          by: ['status'],
          where: { dealerId: dealer.id },
          _count: { _all: true },
        }),
        this.prisma.vehicle.count({ where: { dealerId: dealer.id, status: VehicleStatus.LIVE } }),
        this.prisma.appointment.count({
          where: {
            dealerId: dealer.id,
            status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
            scheduledStart: { gte: now },
          },
        }),
        this.prisma.vehicle.count({
          where: { dealerId: dealer.id, status: VehicleStatus.SOLD, soldAt: { gte: startOfMonth } },
        }),
        this.prisma.lead.count({ where: { dealerId: dealer.id, status: LeadStatus.NEW } }),
      ]);

    return {
      dealer: { id: dealer.id, verificationTier: dealer.verificationTier },
      stockByStatus: Object.fromEntries(stockGroups.map((g) => [g.status, g._count._all])),
      leadsByStatus: Object.fromEntries(leadGroups.map((g) => [g.status, g._count._all])),
      liveListings: liveCount,
      newLeads,
      upcomingAppointments: upcoming,
      salesThisMonth,
    };
  }
}
