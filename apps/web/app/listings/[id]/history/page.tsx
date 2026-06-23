import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '../../../components/site-header';
import { C, display, h1, card } from '../../../../lib/ds';

export const dynamic = 'force-dynamic';

interface History {
  vehicle: {
    id: string;
    regNumber: string;
    make: string | null;
    model: string | null;
    manufactureYear: number | null;
    odometerKm: number | null;
  };
  registration: {
    ownerName: string | null;
    status: string | null;
    verifiedAt: string | null;
    source: string | null;
    insuranceValidTill: string | null;
    insuranceProvider: string | null;
    pucValidTill: string | null;
    hypothecationActive: boolean | null;
    challanCount: number | null;
  } | null;
  certification: { tier: string } | null;
  inspections: {
    type: string;
    overallScore: number | null;
    grade: string | null;
    createdAt: string;
  }[];
  odometer: { fraudRisk: string; declaredKm: number; estimatedKm: number } | null;
  trustFlags: string[];
}

async function getHistory(id: string): Promise<History | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/vehicles/${id}/history`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as History;
  } catch {
    return null;
  }
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

export default async function HistoryReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await getHistory(id);
  if (!h) notFound();

  const reg = h.registration;
  const rows: { label: string; value: string }[] = [
    { label: 'Registration', value: h.vehicle.regNumber },
    { label: 'Owner (RC)', value: reg?.ownerName ?? '—' },
    { label: 'RC status', value: reg?.status ?? (reg?.verifiedAt ? 'Active' : '—') },
    { label: 'VAHAN verified', value: reg?.verifiedAt ? fmt(reg.verifiedAt) : 'Not verified' },
    {
      label: 'Loan / hypothecation',
      value: reg?.hypothecationActive ? 'Active' : reg ? 'None' : '—',
    },
    {
      label: 'Insurance',
      value: reg?.insuranceValidTill
        ? `Valid till ${fmt(reg.insuranceValidTill)}${reg.insuranceProvider ? ` · ${reg.insuranceProvider}` : ''}`
        : '—',
    },
    { label: 'PUC', value: reg?.pucValidTill ? `Valid till ${fmt(reg.pucValidTill)}` : '—' },
    { label: 'Pending challans', value: `${reg?.challanCount ?? 0}` },
  ];

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SiteHeader />
      <main
        style={{
          maxWidth: 820,
          margin: '0 auto',
          padding: 'clamp(18px,3vw,28px) clamp(16px,4vw,40px) 100px',
        }}
      >
        <Link
          href={`/listings/${id}`}
          style={{ color: C.grey, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          ← Back to listing
        </Link>

        <h1 style={{ ...h1, marginTop: 14 }}>Vehicle history report</h1>
        <p style={{ margin: '6px 0 22px', color: C.grey, fontSize: 15 }}>
          {h.vehicle.manufactureYear} {h.vehicle.make} {h.vehicle.model} ·{' '}
          {h.vehicle.odometerKm ? `${h.vehicle.odometerKm.toLocaleString('en-IN')} km` : '—'}
        </p>

        {/* Trust flags */}
        <div style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ fontFamily: display, fontSize: 16, color: C.indigo, margin: '0 0 12px' }}>
            Summary
          </h2>
          {h.trustFlags.length === 0 ? (
            <p style={{ margin: 0, color: '#3B6B45', fontWeight: 600 }}>
              ✓ No red flags found in the records.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, color: C.coralDark }}>
              {h.trustFlags.map((f) => (
                <li key={f} style={{ marginBottom: 4 }}>
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Registration & records */}
        <div style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ fontFamily: display, fontSize: 16, color: C.indigo, margin: '0 0 8px' }}>
            Registration &amp; documents
          </h2>
          <div style={{ display: 'grid', gap: 0 }}>
            {rows.map((r, i) => (
              <div
                key={r.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                  fontSize: 14,
                }}
              >
                <span style={{ color: C.grey }}>{r.label}</span>
                <span style={{ color: C.text, fontWeight: 600, textAlign: 'right' }}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Odometer */}
        {h.odometer && (
          <div style={{ ...card, marginBottom: 18 }}>
            <h2 style={{ fontFamily: display, fontSize: 16, color: C.indigo, margin: '0 0 8px' }}>
              Odometer integrity
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: C.text }}>
              Declared {h.odometer.declaredKm.toLocaleString('en-IN')} km · model estimate{' '}
              {h.odometer.estimatedKm.toLocaleString('en-IN')} km · fraud risk{' '}
              <strong style={{ color: h.odometer.fraudRisk === 'LOW' ? '#3B6B45' : C.coralDark }}>
                {h.odometer.fraudRisk.toLowerCase()}
              </strong>
            </p>
          </div>
        )}

        {/* Inspections */}
        <div style={{ ...card }}>
          <h2 style={{ fontFamily: display, fontSize: 16, color: C.indigo, margin: '0 0 12px' }}>
            Inspections {h.certification ? `· ${h.certification.tier.replace(/_/g, ' ')}` : ''}
          </h2>
          {h.inspections.length === 0 ? (
            <p style={{ margin: 0, color: C.grey }}>No inspections on record yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {h.inspections.map((ins, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}
                >
                  <span style={{ color: C.text }}>
                    {ins.type.replace('_', ' ')} · {fmt(ins.createdAt)}
                  </span>
                  <span style={{ fontWeight: 700, color: C.indigo }}>
                    {ins.grade ? `Grade ${ins.grade}` : ''} {ins.overallScore ?? ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
