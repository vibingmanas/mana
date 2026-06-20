import { describe, it, expect } from 'vitest';
import { ESignService } from './esign.service';
import { LenderService } from './lender.service';

describe('ESignService (mock)', () => {
  const svc = new ESignService();
  it('creates a request and confirms its own ref', async () => {
    const req = await svc.createRequest({ applicationId: 'app-1', documentTitle: 'Loan' });
    expect(req.status).toBe('PENDING');
    expect(req.signUrl).toContain(req.ref);
    expect(await svc.confirm('app-1', req.ref)).toBe(true);
  });
  it('rejects a ref that does not match the application', async () => {
    const req = await svc.createRequest({ applicationId: 'app-1', documentTitle: 'Loan' });
    expect(await svc.confirm('app-2', req.ref)).toBe(false);
  });
});

describe('LenderService (heuristic)', () => {
  const svc = new LenderService();
  it('grants a capped floor-plan limit', async () => {
    const d = await svc.underwriteFloorPlan({ requestedLimit: 9_000_000 });
    expect(d.approved).toBe(true);
    expect(d.creditLimit).toBe(5_000_000);
  });
  it('underwrites a consumer loan', async () => {
    const d = await svc.underwriteConsumer({
      amount: 500000,
      downPayment: 100000,
      tenureMonths: 48,
    });
    expect(typeof d.approved).toBe('boolean');
    expect(d.partner).toBeTruthy();
  });
});
