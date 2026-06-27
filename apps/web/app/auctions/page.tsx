import Link from 'next/link';
import SiteHeader from '../components/site-header';
import { C, display, inr } from '../../lib/ds';

export const dynamic = 'force-dynamic';

interface Auction {
  id: string;
  source: string;
  sourceName: string | null;
  startsAt: string;
  endsAt: string | null;
  guidePrice: number | null;
  status: string;
  vehicle: {
    id: string;
    make: string | null;
    model: string | null;
    manufactureYear: number | null;
    odometerKm: number | null;
    city: string | null;
    state: string | null;
    fairPriceLabel: string | null;
    riskBand: string | null;
    media: { url: string }[];
  };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SOURCES = ['', 'BANK', 'NBFC', 'GOVT', 'COURT'];
const SRC_LABEL: Record<string, string> = {
  BANK: 'Bank',
  NBFC: 'NBFC',
  GOVT: 'Government',
  COURT: 'Court',
};
const RISK_COLOR: Record<string, string> = {
  LOW: '#3B6B45',
  MODERATE: '#9A6B00',
  HIGH: C.coralDark,
};
const FPI: Record<string, string> = {
  UNDERPRICED: 'Underpriced',
  FAIR: 'Fair',
  OVERPRICED: 'Above market',
};

async function getAuctions(params: Record<string, string>): Promise<Auction[]> {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${API}/api/auctions${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Auction[];
  } catch {
    return [];
  }
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default async function Auctions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const params: Record<string, string> = {};
  if (sp.source) params.source = sp.source;
  if (sp.state) params.state = sp.state;
  const auctions = await getAuctions(params);

  const pill = (active: boolean): React.CSSProperties => ({
    border: `1px solid ${active ? C.indigo : C.border}`,
    background: active ? C.indigo : '#fff',
    color: active ? C.cream : C.indigo,
    borderRadius: 11,
    padding: '9px 14px',
    fontSize: 13.5,
    fontWeight: 700,
    textDecoration: 'none',
  });

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SiteHeader />
      <main
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,32px) clamp(16px,4vw,40px) 90px',
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: C.coral,
              marginBottom: 10,
            }}
          >
            Auctions
          </div>
          <h1
            style={{
              fontFamily: display,
              margin: 0,
              fontSize: 'clamp(28px,4vw,42px)',
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: C.indigo,
            }}
          >
            Bank, NBFC &amp; government car auctions
          </h1>
          <p style={{ margin: '8px 0 0', color: C.grey, fontSize: 15.5, maxWidth: 620 }}>
            Seized and repossessed cars with guide prices, fair-value estimates and risk scores —
            plus advisory and documentation help for first-time bidders.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '20px 0 24px' }}>
          {SOURCES.map((s) => (
            <Link
              key={s || 'all'}
              href={s ? `/auctions?source=${s}` : '/auctions'}
              style={pill((sp.source ?? '') === s)}
            >
              {s ? SRC_LABEL[s] : 'All sources'}
            </Link>
          ))}
        </div>

        {auctions.length === 0 ? (
          <p style={{ color: C.grey }}>No auctions scheduled right now. Check back soon.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
              gap: 18,
            }}
          >
            {auctions.map((a) => (
              <Link
                key={a.id}
                href={`/auctions/${a.id}`}
                style={{
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  borderRadius: 22,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '16 / 11', background: C.tint }}>
                  {a.vehicle.media[0] && (
                    <img
                      src={a.vehicle.media[0].url}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: 'rgba(31,39,71,.9)',
                      color: C.cream,
                      fontWeight: 700,
                      fontSize: 11,
                      padding: '5px 10px',
                      borderRadius: 999,
                    }}
                  >
                    {SRC_LABEL[a.source] ?? a.source} auction
                  </span>
                </div>
                <div
                  style={{
                    padding: '16px 18px 18px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{ fontFamily: display, fontWeight: 800, fontSize: 17.5, color: C.text }}
                  >
                    {a.vehicle.manufactureYear} {a.vehicle.make} {a.vehicle.model}
                  </div>
                  <div style={{ fontSize: 13.5, color: C.grey, marginTop: 6 }}>
                    {a.vehicle.city ?? a.vehicle.state}
                    {a.vehicle.odometerKm
                      ? ` · ${(a.vehicle.odometerKm / 1000).toFixed(0)}k km`
                      : ''}
                    {a.sourceName ? ` · ${a.sourceName}` : ''}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
                    {a.vehicle.fairPriceLabel && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '4px 9px',
                          borderRadius: 999,
                          border: `1px solid ${C.border}`,
                          color: C.indigo,
                        }}
                      >
                        {FPI[a.vehicle.fairPriceLabel] ?? 'Fair'}
                      </span>
                    )}
                    {a.vehicle.riskBand && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '4px 9px',
                          borderRadius: 999,
                          border: `1px solid ${C.border}`,
                          color: RISK_COLOR[a.vehicle.riskBand] ?? C.grey,
                        }}
                      >
                        {a.vehicle.riskBand.toLowerCase()} risk
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 14,
                      borderTop: `1px solid ${C.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11.5, color: C.grey, fontWeight: 600 }}>
                        Guide price
                      </div>
                      <div
                        style={{
                          fontFamily: display,
                          fontWeight: 800,
                          fontSize: 20,
                          color: C.indigo,
                        }}
                      >
                        {inr(a.guidePrice)}
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: 'right',
                        fontSize: 12.5,
                        color: C.coral,
                        fontWeight: 700,
                      }}
                    >
                      {a.status === 'LIVE' ? 'Live now' : fmtDate(a.startsAt)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
