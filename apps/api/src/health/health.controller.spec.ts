import { describe, it, expect, vi } from 'vitest';
import { HealthController } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  it('reports ok when db is reachable', async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const controller = new HealthController(prisma as unknown as PrismaService);
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
    expect(result.service).toBe('mana-api');
  });

  it('reports degraded when db is down', async () => {
    const prisma = { $queryRaw: vi.fn().mockRejectedValue(new Error('no db')) };
    const controller = new HealthController(prisma as unknown as PrismaService);
    const result = await controller.check();
    expect(result.status).toBe('degraded');
    expect(result.db).toBe('down');
  });
});
