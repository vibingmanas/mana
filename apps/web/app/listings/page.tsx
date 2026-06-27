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
  ownersCount: number | null;
  price: number | null;
  city: string | null;
  state: string | null;
  fuelType: string | null;
  source: string | null;
  dealScore: number | null;
  fairPriceLabel: string | null;
  riskBand: string | null;
  accidentFree: boolean | null;
  media: { url: string }[];
  certification: { tier: string } | null;
}
interface Result {
  total: number;
  items: Card[];
}
interface Facet {
  value: string;
  count: number;
}
interface Facets {
  states: Facet[];
  makes: Facet[];
  bodyTypes: Facet[];
  sources: Facet[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function search(params: Record<string, string>): Promise<Result> {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${API}/api/listings${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
    if (!res.ok) return { total: 0, items: [] };
    return (await res.json()) as Result;
  } catch {
    return { total: 0, items: [] };
  }
}
async function getFacets(): Promise<Facets> {
  try {
    const res = await fetch(`${API}/api/listings/facets`, { cache: 'no-store' });
    if (!res.ok) return { states: [], makes: [], bodyTypes: [], sources: [] };
    return (await res.json()) as Facets;
  } catch {
    return { states: [], makes: [], bodyTypes: [], sources: [] };
  }
}
async function getCities(state: string): Promise<Facet[]> {
  try {
    const res = await fetch(`${API}/api/listings/cities?state=${encodeURIComponent(state)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return (await res.json()) as Facet[];
  } catch {
    return [];
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
const FPI_LABEL: Record<string, string> = {
  UNDERPRICED: 'Underpriced',
  FAIR: 'Fair price',
  OVERPRICED: 'Above market',
};
const FPI_COLOR: Record<string, string> = {
  UNDERPRICED: '#3B6B45',
  FAIR: C.indigo,
  OVERPRICED: C.coralDark,
};
const RISK_LABEL: Record<string, string> = {
  LOW: 'Low risk',
  MODERATE: 'Moderate',
  HIGH: 'High risk',
};
const RISK_COLOR: Record<string, string> = {
  LOW: '#3B6B45',
  MODERATE: '#9A6B00',
  HIGH: C.coralDark,
};
const SOURCE_LABEL: Record<string, string> = {
  DEALER: 'Dealer',
  INDIVIDUAL: 'Owner',
  AUCTION: 'Auction',
  PLATFORM: 'Platform',
};
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
const FUELS = ['', 'Petrol', 'Diesel', 'CNG', 'Electric'];
const TRANSMISSIONS = ['', 'Manual', 'Automatic'];
const OWNERS = [
  { label: 'Any', v: '' },
  { label: '1st owner', v: '1' },
  { label: '≤ 2 owners', v: '2' },
];
const YEARS = [
  { label: 'Any age', v: '' },
  { label: '2020 +', v: '2020' },
  { label: '2018 +', v: '2018' },
  { label: '2015 +', v: '2015' },
];
const KMS = [
  { label: 'Any km', v: '' },
  { label: '≤ 30k', v: '30000' },
  { label: '≤ 60k', v: '60000' },
  { label: '≤ 1L', v: '100000' },
];
const PASS_KEYS = [
  'make',
  'model',
  'city',
  'state',
  'fuelType',
  'transmission',
  'bodyType',
  'source',
  'minPrice',
  'maxPrice',
  'maxOwners',
  'minYear',
  'maxKm',
  'luxury',
  'verifiedOnly',
  'accidentFree',
  'riskBand',
  'sort',
];

export default async function Listings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const params: Record<string, string> = {};
  for (const k of PASS_KEYS) if (sp[k]) params[k] = sp[k];

  const [{ total, items }, facets, cities] = await Promise.all([
    search(params),
    getFacets(),
    sp.state ? getCities(sp.state) : Promise.resolve([] as Facet[]),
  ]);

  const pill = (active: boolean): React.CSSProperties => ({
    display: 'inline-block',
    border: `1px solid ${active ? C.indigo : C.border}`,
    background: active ? C.indigo : '#fff',
    color: active ? C.cream : C.indigo,
    borderRadius: 11,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 700,
    textDecoration: 'none',
  });
  const withParam = (patch: Record<string, string>) => {
    const next = { ...sp, ...patch };
    Object.keys(next).forEach((k) => next[k] === '' && delete next[k]);
    return `/listings?${new URLSearchParams(next).toString()}`;
  };
  const toggle = (key: string) => withParam({ [key]: sp[key] === 'true' ? '' : 'true' });

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: C.grey,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{children}</div>
    </div>
  );

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
            Used cars{sp.state ? ` · ${sp.state}` : ' · all India'}
          </h1>
          <p style={{ margin: '6px 0 0', color: C.grey, fontSize: 15 }}>
            {total} cars across dealers, owners &amp; auctions · fair-price &amp; risk on every car
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
          <aside style={{ flex: '1 1 240px', maxWidth: 290, minWidth: 230 }}>
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
                placeholder="Search make or model"
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

            {/* Location drill-down: state → city */}
            <Section title={sp.state ? `${sp.state} · city` : 'Location · state'}>
              {!sp.state ? (
                <>
                  <Link href={withParam({ state: '', city: '' })} style={pill(!sp.state)}>
                    All India
                  </Link>
                  {facets.states.slice(0, 8).map((s) => (
                    <Link
                      key={s.value}
                      href={withParam({ state: s.value, city: '' })}
                      style={pill(false)}
                    >
                      {s.value} ({s.count})
                    </Link>
                  ))}
                </>
              ) : (
                <>
                  <Link href={withParam({ state: '', city: '' })} style={pill(false)}>
                    ← All India
                  </Link>
                  <Link href={withParam({ city: '' })} style={pill(!sp.city)}>
                    All {sp.state}
                  </Link>
                  {cities.map((c) => (
                    <Link
                      key={c.value}
                      href={withParam({ city: c.value })}
                      style={pill(sp.city === c.value)}
                    >
                      {c.value} ({c.count})
                    </Link>
                  ))}
                </>
              )}
            </Section>

            {/* Quick toggles */}
            <Section title="Trust & type">
              <Link href={toggle('verifiedOnly')} style={pill(sp.verifiedOnly === 'true')}>
                Verified only
              </Link>
              <Link href={toggle('accidentFree')} style={pill(sp.accidentFree === 'true')}>
                Accident-free
              </Link>
              <Link href={toggle('luxury')} style={pill(sp.luxury === 'true')}>
                Luxury
              </Link>
              <Link
                href={withParam({ source: sp.source === 'AUCTION' ? '' : 'AUCTION' })}
                style={pill(sp.source === 'AUCTION')}
              >
                Auctions
              </Link>
            </Section>

            <Section title="Seller">
              <Link href={withParam({ source: '' })} style={pill(!sp.source)}>
                Any
              </Link>
              {facets.sources.map((s) => (
                <Link
                  key={s.value}
                  href={withParam({ source: s.value })}
                  style={pill(sp.source === s.value)}
                >
                  {SOURCE_LABEL[s.value] ?? s.value}
                </Link>
              ))}
            </Section>

            <Section title="Budget">
              {BUDGETS.map((b) => (
                <Link
                  key={b.label}
                  href={withParam({ minPrice: b.min, maxPrice: b.max })}
                  style={pill((sp.minPrice ?? '') === b.min && (sp.maxPrice ?? '') === b.max)}
                >
                  {b.label}
                </Link>
              ))}
            </Section>

            <Section title="Owners">
              {OWNERS.map((o) => (
                <Link
                  key={o.label}
                  href={withParam({ maxOwners: o.v })}
                  style={pill((sp.maxOwners ?? '') === o.v)}
                >
                  {o.label}
                </Link>
              ))}
            </Section>

            <Section title="Year">
              {YEARS.map((y) => (
                <Link
                  key={y.label}
                  href={withParam({ minYear: y.v })}
                  style={pill((sp.minYear ?? '') === y.v)}
                >
                  {y.label}
                </Link>
              ))}
            </Section>

            <Section title="Kilometres">
              {KMS.map((k) => (
                <Link
                  key={k.label}
                  href={withParam({ maxKm: k.v })}
                  style={pill((sp.maxKm ?? '') === k.v)}
                >
                  {k.label}
                </Link>
              ))}
            </Section>

            <Section title="Body">
              <Link href={withParam({ bodyType: '' })} style={pill(!sp.bodyType)}>
                Any
              </Link>
              {facets.bodyTypes.map((b) => (
                <Link
                  key={b.value}
                  href={withParam({ bodyType: b.value })}
                  style={pill(sp.bodyType === b.value)}
                >
                  {b.value}
                </Link>
              ))}
            </Section>

            <Section title="Fuel">
              {FUELS.map((f) => (
                <Link
                  key={f || 'any'}
                  href={withParam({ fuelType: f })}
                  style={pill((sp.fuelType ?? '') === f)}
                >
                  {f || 'Any'}
                </Link>
              ))}
            </Section>

            <Section title="Transmission">
              {TRANSMISSIONS.map((t) => (
                <Link
                  key={t || 'any'}
                  href={withParam({ transmission: t })}
                  style={pill((sp.transmission ?? '') === t)}
                >
                  {t || 'Any'}
                </Link>
              ))}
            </Section>
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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  ['recent', 'Newest'],
                  ['price_asc', 'Price ↑'],
                  ['price_desc', 'Price ↓'],
                  ['deal', 'Best deals'],
                  ['risk', 'Lowest risk'],
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
                        {SOURCE_LABEL[c.source ?? 'DEALER'] ?? 'Dealer'}
                      </span>
                      {c.certification && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            background: 'rgba(255,255,255,.94)',
                            color: C.indigo,
                            fontWeight: 700,
                            fontSize: 11,
                            padding: '5px 10px',
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
                        {c.city ?? c.state}
                        {c.odometerKm ? ` · ${(c.odometerKm / 1000).toFixed(0)}k km` : ''}
                        {c.ownersCount ? ` · ${c.ownersCount} own.` : ''}
                        {c.fuelType ? ` · ${c.fuelType}` : ''}
                      </div>
                      {/* Intel chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
                        {c.fairPriceLabel && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '4px 9px',
                              borderRadius: 999,
                              background: '#fff',
                              border: `1px solid ${C.border}`,
                              color: FPI_COLOR[c.fairPriceLabel] ?? C.indigo,
                            }}
                          >
                            {FPI_LABEL[c.fairPriceLabel] ?? 'Fair price'}
                          </span>
                        )}
                        {c.riskBand && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '4px 9px',
                              borderRadius: 999,
                              background: '#fff',
                              border: `1px solid ${C.border}`,
                              color: RISK_COLOR[c.riskBand] ?? C.grey,
                            }}
                          >
                            {RISK_LABEL[c.riskBand] ?? c.riskBand}
                          </span>
                        )}
                        {c.accidentFree === true && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '4px 9px',
                              borderRadius: 999,
                              background: '#fff',
                              border: `1px solid ${C.border}`,
                              color: '#3B6B45',
                            }}
                          >
                            Accident-free
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'space-between',
                          marginTop: 'auto',
                          paddingTop: 14,
                          gap: 10,
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
