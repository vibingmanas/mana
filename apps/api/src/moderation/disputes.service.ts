import { Injectable, NotFoundException } from '@nestjs/common';
import { DisputeStatus } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  raise(
    userId: string,
    input: { type: string; message: string; vehicleId?: string; dealerId?: string },
  ) {
    return this.prisma.dispute.create({
      data: {
        raisedByUserId: userId,
        type: input.type,
        message: input.message,
        vehicleId: input.vehicleId ?? null,
        dealerId: input.dealerId ?? null,
      },
    });
  }

  listForAdmin(status?: DisputeStatus) {
    return this.prisma.dispute.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async resolve(id: string, status: DisputeStatus, resolution: string) {
    const d = await this.prisma.dispute.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Dispute not found');
    return this.prisma.dispute.update({ where: { id }, data: { status, resolution } });
  }
}
