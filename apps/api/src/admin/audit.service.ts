import { Injectable } from '@nestjs/common';
import { Prisma } from '@mana/db';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip?: string;
}

/** Writes the append-only admin audit trail (plans/06-admin-panel.md). */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(e: AuditEntry) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: e.actorUserId,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId ?? null,
        before: (e.before as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        after: (e.after as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        reason: e.reason ?? null,
        ip: e.ip ?? null,
      },
    });
  }
}
