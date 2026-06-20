import Link from 'next/link';
import SiteHeader from '../components/site-header';
import { C, display, inr } from '../../lib/ds';

export const dynamic = 'force-dynamic';

interface Card {
  id: string;
  make: string | null;
  model: string | null;
  manufactureYear: number | null;
  odometerKm: number | null;
  price: number | null;
  city: string | null;
  fuelType: string | null;
  dealScore: number | null;
  media: { url: string }[];
  certification: { tier: string } | null;
}
interface Result {
  total: number;
  items: Card[];
}

async function search(params: Record<string, string>): Promise<Result> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${base}/api/listings${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
    if (!res.ok) return { total: 0, items: [] };
    return (await res.json()) as Result;
  } catch {
    return { total: 0, items: [] };
  }
}

function emiFrom(price: number | null): string {
  if (!price) return '';
  const loan = price * 0.8;
  const r = 10.5 / 12 / 100;
  const n = 60;
  const m = Math.round((loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  return `EMI ₹${m.toLocaleString('en-IN')}/mo`;
}
function deal(score: number | null): string {
  if (score == null) return 'Fair price';
  if (score >= 0.08) return 'Great deal';
  if (score >= -0.05) return 'Fair price';
  return 'Above market';
}
const CERT: Record<string, string> = {
  SELF_DECLARED: 'Listed',
  AI_CHECKED: 'AI-checked',
  MANA_INSPECTED: 'Mana Inspected',
  MANA_CERTIFIED: 'Mana Certified',
};

const BUDGETS = [
  { label: 'Any budget', min: '', max: '' },
  { label: 'Under ₹5L', min: '', max: '500000' },
  { label: '₹5L – ₹10L', min: '500000', max: '1000000' },
  { label: '₹10L – ₹15L', min: '1000000', max: '1500000' },
  { label: '₹15L +', min: '1500000', max: '' },
];
const FUELS = ['', 'Petrol', 'Diesel'];

export default async function Listings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const params: Record<string, string> = {};
  for (const k of ['make', 'model', 'city', 'fuelType', 'minPrice', 'maxPrice', 'sort'])
    if (sp[k]) params[k] = sp[k];
  const { total, items } = await search(params);

  const pill = (active: boolean): React.CSSProperties => ({
    display: 'inline-block',
    border: `1px solid ${active ? C.indigo : C.border}`,
    background: active ? C.indigo : '#fff',
    color: active ? C.cream : C.indigo,
    borderRadius: 11,
    padding: '9px 13px',
    fontSize: 13.5,
    fontWeight: 700,
    textDecoration: 'none',
  });
  const withParam = (patch: Record<string, string>) => {
    const next = { ...sp, ...patch };
    Object.keys(next).forEach((k) => next[k] === '' && delete next[k]);
    return `/listings?${new URLSearchParams(next).toString()}`;
  };

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SiteHeader />
      <main
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,32px) clamp(16px,4vw,40px) 80px',
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <h1
            style={{
              fontFamily: display,
              margin: 0,
              fontSize: 'clamp(28px,4vw,40px)',
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: C.indigo,
            }}
          >
            Used cars{sp.make ? ` · ${sp.make}` : ''}
          </h1>
          <p style={{ margin: '6px 0 0', color: C.grey, fontSize: 15 }}>
            {total} inspected cars · transparent on-road pricing · 7-day returns
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(20px,2.5vw,36px)',
            alignItems: 'flex-start',
          }}
        >
          <aside style={{ flex: '1 1 230px', maxWidth: 280, minWidth: 220 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <span style={{ fontFamily: display, fontWeight: 800, fontSize: 18, color: C.indigo }}>
                Filters
              </span>
              <Link
                href="/listings"
                style={{ color: C.coral, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
              >
                Clear all
              </Link>
            </div>

            <form action="/listings" method="get" style={{ marginBottom: 22 }}>
              <input
                name="make"
                defaultValue={sp.make ?? ''}
                placeholder="Make or model"
                style={{
                  width: '100%',
                  border: `1px solid ${C.border}`,
                  borderRadius: 11,
                  padding: '10px 13px',
                  fontSize: 14,
                  color: C.text,
                  background: '#fff',
                }}
              />
            </form>

            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: C.grey,
                marginBottom: 11,
              }}
            >
              Budget
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 22 }}>
              {BUDGETS.map((b) => {
                const active = (sp.minPrice ?? '') === b.min && (sp.maxPrice ?? '') === b.max;
                return (
                  <Link
                    key={b.label}
                    href={withParam({ minPrice: b.min, maxPrice: b.max })}
                    style={pill(active)}
                  >
                    {b.label}
                  </Link>
                );
              })}
            </div>

            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: C.grey,
                marginBottom: 11,
              }}
            >
              Fuel
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {FUELS.map((f) => (
                <Link
                  key={f || 'any'}
                  href={withParam({ fuelType: f })}
                  style={pill((sp.fuelType ?? '') === f)}
                >
                  {f || 'Any'}
                </Link>
              ))}
            </div>
          </aside>

          <div style={{ flex: '999 1 380px', minWidth: 300 }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <span style={{ fontSize: 14, color: C.grey, fontWeight: 600 }}>
                <b style={{ color: C.text, fontWeight: 800 }}>{total}</b> results
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  ['recent', 'Newest'],
                  ['price_asc', 'Price ↑'],
                  ['price_desc', 'Price ↓'],
                  ['deal', 'Best deals'],
                ].map(([v, l]) => (
                  <Link
                    key={v}
                    href={withParam({ sort: v })}
                    style={{
                      ...pill((sp.sort ?? 'recent') === v),
                      padding: '8px 12px',
                      fontSize: 13,
                    }}
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>

            {items.length === 0 ? (
              <div
                style={{
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  borderRadius: 22,
                  padding: '60px 24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 800,
                    fontSize: 20,
                    color: C.indigo,
                    marginBottom: 6,
                  }}
                >
                  No cars match those filters
                </div>
                <div style={{ fontSize: 15, color: C.grey, marginBottom: 20 }}>
                  Try widening your budget or clearing a filter.
                </div>
                <Link
                  href="/listings"
                  style={{
                    background: C.indigo,
                    color: C.cream,
                    borderRadius: 13,
                    padding: '13px 24px',
                    fontWeight: 700,
                    fontSize: 15,
                    textDecoration: 'none',
                  }}
                >
                  Clear all filters
                </Link>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
                  gap: 18,
                }}
              >
                {items.map((c) => (
                  <Link
                    key={c.id}
                    href={`/listings/${c.id}`}
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
                    <div
                      style={{ position: 'relative', aspectRatio: '16 / 11', background: C.tint }}
                    >
                      {c.media[0] && (
                        <img
                          src={c.media[0].url}
                          alt=""
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                      {c.certification && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            background: 'rgba(255,255,255,.94)',
                            color: C.indigo,
                            fontWeight: 700,
                            fontSize: 11.5,
                            padding: '6px 11px',
                            borderRadius: 999,
                          }}
                        >
                          {CERT[c.certification.tier] ?? 'Listed'}
                        </span>
                      )}
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
                        style={{
                          fontFamily: display,
                          fontWeight: 800,
                          fontSize: 17.5,
                          color: C.text,
                        }}
                      >
                        {c.manufactureYear} {c.make} {c.model}
                      </div>
                      <div style={{ fontSize: 13.5, color: C.grey, marginTop: 6 }}>
                        {c.city}
                        {c.odometerKm ? ` · ${(c.odometerKm / 1000).toFixed(0)}k km` : ''}
                        {c.fuelType ? ` · ${c.fuelType}` : ''}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'space-between',
                          marginTop: 15,
                          gap: 10,
                          paddingTop: 14,
                          borderTop: `1px solid ${C.border}`,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: display,
                              fontWeight: 800,
                              fontSize: 21,
                              color: C.indigo,
                            }}
                          >
                            {inr(c.price)}
                          </div>
                          <div style={{ fontSize: 12.5, color: C.grey }}>{emiFrom(c.price)}</div>
                        </div>
                        <span
                          style={{
                            background: C.cream,
                            border: `1px solid ${C.border}`,
                            color: C.indigo,
                            fontWeight: 700,
                            fontSize: 11.5,
                            padding: '5px 11px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {deal(c.dealScore)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
