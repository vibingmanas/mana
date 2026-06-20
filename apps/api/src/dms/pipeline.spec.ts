import { describe, it, expect } from 'vitest';
import { LeadStatus } from '@mana/db';
import { groupByStage, countByStage, PIPELINE_STAGES } from './pipeline';

const leads = [{ status: LeadStatus.NEW }, { status: LeadStatus.NEW }, { status: LeadStatus.WON }];

describe('pipeline helpers', () => {
  it('groups leads with every stage present', () => {
    const g = groupByStage(leads);
    expect(Object.keys(g).sort()).toEqual([...PIPELINE_STAGES].sort());
    expect(g.NEW).toHaveLength(2);
    expect(g.WON).toHaveLength(1);
    expect(g.LOST).toHaveLength(0);
  });

  it('counts per stage', () => {
    const c = countByStage(leads);
    expect(c.NEW).toBe(2);
    expect(c.WON).toBe(1);
    expect(c.CONTACTED).toBe(0);
  });
});
