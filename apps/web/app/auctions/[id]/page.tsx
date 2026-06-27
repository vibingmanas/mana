import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '../../components/site-header';
import AlertButton from './alert-button';
import { C, display, h1, card, inr } from '../../../lib/ds';

export const dynamic = 'force-dynamic';

interface Auction {
  id: string;
  source: string;
  sourceName: string | null;
  lotNumber: string | null;
  venue: string | null;
  startsAt: string;
  endsAt: string | null;
  guidePrice: number | null;
  reservePrice: number | null;
  status: string;
  docsChecklist: string[] | null;
  vehicle: {
    id: string;
    make: string | null;
    model: string | null;
    variant: string | null;
    manufactureYear: number | null;
    odometerKm: number | null;
    ownersCount: number | null;
    fuelType: string | null;
    transmission: string | null;
    city: string | null;
    state: string | null;
    valuationFair: number | null;
    fairPriceLabel: string | null;
    riskScore: number | null;
    riskBand: string | null;
    riskFactors: { key: string; label: string }[] | null;
    media: { url: string }[];
  };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SRC_LABEL: Record<string, string> = {
  BANK: 'Bank',
  NBFC: 'NBFC',
  GOVT: 'Government',
  COURT: 'Court',
};
const FPI: Record<string, string> = {
  UNDERPRICED: 'Underpriced',
  FAIR: 'Fair price',
  OVERPRICED: 'Above market',
};
const RISK_LABEL: Record<string, string> = {
  LOW: 'Low risk',
  MODERATE: 'Moderate risk',
  HIGH: 'High risk',
};
const RISK_COLOR: Record<string, string> = {
  LOW: '#3B6B45',
  MODERATE: '#9A6B00',
  HIGH: C.coralDark,
};

async function getAuction(id: string): Promise<Auction | null> {
  try {
    const res = await fetch(`${API}/api/auctions/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Auction;
  } catch {
    return null;
  }
}

const fmt = (d: string) =>
  new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default async function AuctionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getAuction(id);
  if (!a) notFound();
  const v = a.vehicle;
  const docs = Array.isArray(a.docsChecklist) ? a.docsChecklist : [];

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SiteHeader />
      <main
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'clamp(18px,3vw,28px) clamp(16px,4vw,40px) 110px',
        }}
      >
        <Link
          href="/auctions"
          style={{ color: C.grey, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          ← All auctions
        </Link>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(22px,3vw,40px)',
            marginTop: 16,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: '999 1 380px', minWidth: 300 }}>
            <div
              style={{
                aspectRatio: '16/10',
                borderRadius: 24,
                overflow: 'hidden',
                background: C.tint,
              }}
            >
              {v.media[0] && (
                <img
                  src={v.media[0].url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>

            <span
              style={{
                display: 'inline-block',
                marginTop: 18,
                background: C.tint,
                color: C.indigo,
                fontWeight: 700,
                fontSize: 12.5,
                padding: '6px 13px',
                borderRadius: 999,
              }}
            >
              {SRC_LABEL[a.source] ?? a.source} auction{a.sourceName ? ` · ${a.sourceName}` : ''}
            </span>
            <h1 style={{ ...h1, fontSize: 'clamp(26px,4vw,38px)', marginTop: 12 }}>
              {v.manufactureYear} {v.make} {v.model}
            </h1>
            <p style={{ color: C.grey, fontSize: 15, margin: '8px 0 0' }}>
              {v.variant ? `${v.variant} · ` : ''}
              {v.city ?? v.state}
              {v.odometerKm ? ` · ${v.odometerKm.toLocaleString('en-IN')} km` : ''}
              {v.fuelType ? ` · ${v.fuelType}` : ''}
              {v.transmission ? ` · ${v.transmission}` : ''}
            </p>

            {/* Intel */}
            <div style={{ display: 'grid', gap: 12, marginTop: 22 }}>
              {v.fairPriceLabel && (
                <div style={{ ...card }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '.12em',
                      textTransform: 'uppercase',
                      color: C.grey,
                      marginBottom: 6,
                    }}
                  >
                    Fair Price Index
                  </div>
                  <span
                    style={{ fontFamily: display, fontWeight: 800, fontSize: 18, color: C.indigo }}
                  >
                    {FPI[v.fairPriceLabel] ?? 'Fair price'}
                  </span>
                  {v.valuationFair ? (
                    <span style={{ color: C.grey }}> · fair value ~{inr(v.valuationFair)}</span>
                  ) : null}
                </div>
              )}
              {v.riskScore != null && (
                <div style={{ ...card }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '.12em',
                      textTransform: 'uppercase',
                      color: C.grey,
                      marginBottom: 6,
                    }}
                  >
                    Risk score
                  </div>
                  <span
                    style={{
                      fontFamily: display,
                      fontWeight: 800,
                      fontSize: 22,
                      color: RISK_COLOR[v.riskBand ?? 'MODERATE'],
                    }}
                  >
                    {v.riskScore}/10
                  </span>
                  <span style={{ color: RISK_COLOR[v.riskBand ?? 'MODERATE'], fontWeight: 700 }}>
                    {' '}
                    · {RISK_LABEL[v.riskBand ?? 'MODERATE']}
                  </span>
                  {v.riskFactors && v.riskFactors.length > 0 && (
                    <ul
                      style={{
                        margin: '10px 0 0',
                        paddingLeft: 18,
                        color: C.text,
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      {v.riskFactors.map((f) => (
                        <li key={f.key}>{f.label}</li>
                      ))}
                    </ul>
                  )}
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: C.grey }}>
                    Auction cars are sold as-is — bid with this in mind.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right rail */}
          <aside
            style={{ flex: '1 1 320px', maxWidth: 380, minWidth: 290, position: 'sticky', top: 96 }}
          >
            <div style={{ ...card, borderRadius: 24, boxShadow: '0 16px 50px rgba(31,39,71,.09)' }}>
              <div style={{ fontSize: 13, color: C.grey, fontWeight: 600 }}>Guide price</div>
              <div
                style={{
                  fontFamily: display,
                  fontSize: 34,
                  fontWeight: 800,
                  color: C.indigo,
                  letterSpacing: '-.02em',
                }}
              >
                {inr(a.guidePrice)}
              </div>
              {a.reservePrice ? (
                <div style={{ color: C.grey, fontSize: 13 }}>Reserve ~{inr(a.reservePrice)}</div>
              ) : null}

              <div style={{ display: 'grid', gap: 8, margin: '16px 0', fontSize: 14 }}>
                <Row label="Starts" value={fmt(a.startsAt)} />
                {a.endsAt ? <Row label="Ends" value={fmt(a.endsAt)} /> : null}
                {a.lotNumber ? <Row label="Lot" value={a.lotNumber} /> : null}
                {a.venue ? <Row label="Venue" value={a.venue} /> : null}
                <Row label="Status" value={a.status.toLowerCase()} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <AlertButton city={v.city} state={v.state} source={a.source} />
              </div>
              <a
                href="https://wa.me/?text=I%27d%20like%20auction%20bidding%20advisory"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: C.coral,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '13px',
                  borderRadius: 13,
                  textDecoration: 'none',
                }}
              >
                Get bidding advisory
              </a>
            </div>

            <div style={{ ...card, marginTop: 14 }}>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 15,
                  color: C.indigo,
                  marginBottom: 10,
                }}
              >
                Documents to carry
              </div>
              <ul
                style={{ margin: 0, paddingLeft: 18, color: C.text, fontSize: 14, lineHeight: 1.7 }}
              >
                {docs.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ color: C.grey }}>{label}</span>
      <span style={{ color: C.text, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
