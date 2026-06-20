import { LeadStatus } from '@mana/db';

export const PIPELINE_STAGES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.APPOINTMENT,
  LeadStatus.WON,
  LeadStatus.LOST,
];

/** Group leads into a stage->items map with every stage present (even if empty). */
export function groupByStage<T extends { status: LeadStatus }>(
  leads: T[],
): Record<LeadStatus, T[]> {
  const out = {} as Record<LeadStatus, T[]>;
  for (const stage of PIPELINE_STAGES) out[stage] = [];
  for (const lead of leads) (out[lead.status] ??= []).push(lead);
  return out;
}

/** Counts per stage, every stage present. */
export function countByStage<T extends { status: LeadStatus }>(
  leads: T[],
): Record<LeadStatus, number> {
  const grouped = groupByStage(leads);
  const out = {} as Record<LeadStatus, number>;
  for (const stage of PIPELINE_STAGES) out[stage] = grouped[stage].length;
  return out;
}
