import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '../../components/site-header';
import BuyerActions from './buyer-actions';
import CompareButton from '../../components/compare-button';
import CompareTray from '../../components/compare-tray';
import { C, display, inr } from '../../../lib/ds';

export const dynamic = 'force-dynamic';

interface Listing {
  id: string;
  make: string | null;
  model: string | null;
  variant: string | null;
  manufactureYear: number | null;
  odometerKm: number | null;
  ownersCount: number | null;
  fuelType: string | null;
  transmission: string | null;
  color: string | null;
  price: number | null;
  valuationFair: number | null;
  dealScore: number | null;
  fairPriceLabel: string | null;
  riskScore: number | null;
  riskBand: string | null;
  riskFactors: { key: string; label: string; points: number }[] | null;
  source: string | null;
  sellerName: string | null;
  city: string | null;
  media: { url: string; type: string }[];
  certification: { tier: string } | null;
  inspections: {
    overallScore: number | null;
    grade: string | null;
    sectionScores: Record<string, number> | null;
  }[];
  odometerChecks: { fraudRisk: string }[];
  verification: {
    verifiedAt: string | null;
    rcStatus: string | null;
    insuranceValidTill: string | null;
    pucValidTill: string | null;
    hypothecationActive: boolean | null;
    challanCount: number | null;
  } | null;
  dealer: {
    displayName: string | null;
    city: string | null;
    state: string | null;
    verificationTier: string;
  } | null;
}

async function getListing(id: string): Promise<Listing | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/listings/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as Listing;
  } catch {
    return null;
  }
}

const CERT: Record<string, string> = {
  SELF_DECLARED: 'Listed',
  AI_CHECKED: 'AI-checked',
  MANA_INSPECTED: 'Mana Inspected',
  MANA_CERTIFIED: 'Mana Certified',
};
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
  MODERATE: 'Moderate risk',
  HIGH: 'High risk',
};
const RISK_COLOR: Record<string, string> = {
  LOW: '#3B6B45',
  MODERATE: '#9A6B00',
  HIGH: C.coralDark,
};
const SECTION_LABEL: Record<string, string> = {
  engine: 'Engine',
  transmission: 'Transmission',
  electrical: 'Electricals',
  suspensionBrakes: 'Suspension & brakes',
  structureBody: 'Structure & body',
  interior: 'Interior',
  tyres: 'Tyres',
  ac: 'Air-con',
};

function emi(loan: number, rate: number, months: number): number {
  const r = rate / 12 / 100;
  return Math.round((loan * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
}

export default async function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = await getListing(id);
  if (!car) notFound();

  const v = car.verification;
  const insp = car.inspections?.[0];
  const odo = car.odometerChecks?.[0];
  const price = car.price ?? 0;
  const exShowroom = Math.round(price / 1.11);
  const rto = Math.round(exShowroom * 0.08);
  const insurance = price - exShowroom - rto;
  const monthly = price ? emi(Math.round(price * 0.8), 10.5, 60) : 0;

  const dealText =
    car.dealScore == null
      ? 'Fair price'
      : car.dealScore >= 0.08
        ? 'Great deal'
        : car.dealScore >= -0.05
          ? 'Fair price'
          : 'Above market';
  const circ = 2 * Math.PI * 56;
  const score = insp?.overallScore ?? 0;

  const history: { label: string; value: string; ok: boolean }[] = [
    {
      label: 'Owners',
      value: car.ownersCount ? `${car.ownersCount}` : '—',
      ok: (car.ownersCount ?? 9) <= 2,
    },
    {
      label: 'RC status',
      value: v?.rcStatus || (v?.verifiedAt ? 'Active' : '—'),
      ok: !!v?.verifiedAt,
    },
    {
      label: 'Loan / hypothecation',
      value: v?.hypothecationActive ? 'Active — to clear' : 'None',
      ok: v?.hypothecationActive === false,
    },
    {
      label: 'Insurance',
      value: v?.insuranceValidTill
        ? `Valid till ${new Date(v.insuranceValidTill).toLocaleDateString('en-IN')}`
        : '—',
      ok: !!v?.insuranceValidTill && new Date(v.insuranceValidTill) > new Date(),
    },
    {
      label: 'PUC',
      value: v?.pucValidTill
        ? `Valid till ${new Date(v.pucValidTill).toLocaleDateString('en-IN')}`
        : '—',
      ok: !!v?.pucValidTill,
    },
    {
      label: 'Pending challans',
      value: `${v?.challanCount ?? 0}`,
      ok: (v?.challanCount ?? 0) === 0,
    },
  ];
  const keyFacts = [
    { label: 'Year', value: car.manufactureYear ?? '—' },
    { label: 'Km driven', value: car.odometerKm ? `${(car.odometerKm / 1000).toFixed(0)}k` : '—' },
    { label: 'Fuel', value: car.fuelType ?? '—' },
    { label: 'Transmission', value: car.transmission ?? '—' },
  ];

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SiteHeader />
      <main
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(18px,3vw,28px) clamp(16px,4vw,40px) 120px',
        }}
      >
        <Link
          href="/listings"
          style={{ color: C.grey, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          ← Back to results
        </Link>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(22px,3vw,40px)',
            alignItems: 'flex-start',
            marginTop: 16,
          }}
        >
          {/* Left */}
          <div style={{ flex: '999 1 400px', minWidth: 300 }}>
            <div
              style={{
                aspectRatio: '16 / 10',
                borderRadius: 24,
                overflow: 'hidden',
                background: C.tint,
              }}
            >
              {car.media[0] && (
                <img
                  src={car.media[0].url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            {car.media.length > 1 && (
              <div
                className="mana-scroll"
                style={{ display: 'flex', gap: 10, marginTop: 12, overflowX: 'auto' }}
              >
                {car.media.slice(0, 6).map((m, i) => (
                  <div
                    key={i}
                    style={{
                      width: 90,
                      height: 64,
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: C.tint,
                      flex: '0 0 auto',
                    }}
                  >
                    <img
                      src={m.url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 26 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {car.certification && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: C.tint,
                      color: C.indigo,
                      fontWeight: 700,
                      fontSize: 13,
                      padding: '7px 13px',
                      borderRadius: 999,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.indigo}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                    {CERT[car.certification.tier] ?? 'Listed'}
                    {insp ? ' · 200-point inspection' : ''}
                  </span>
                )}
                <span
                  style={{
                    background: C.cream,
                    border: `1px solid ${C.border}`,
                    color: C.indigo,
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '7px 13px',
                    borderRadius: 999,
                  }}
                >
                  Odometer{' '}
                  {(odo?.fraudRisk ?? 'LOW') === 'LOW' ? 'verified' : odo?.fraudRisk.toLowerCase()}
                </span>
              </div>
              {car.variant && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: C.coral,
                    marginBottom: 10,
                  }}
                >
                  {car.variant} · {car.fuelType} {car.transmission}
                </div>
              )}
              <h1
                style={{
                  fontFamily: display,
                  margin: 0,
                  fontSize: 'clamp(28px,4vw,42px)',
                  fontWeight: 800,
                  letterSpacing: '-.03em',
                  color: C.text,
                  lineHeight: 1,
                }}
              >
                {car.manufactureYear} {car.make} {car.model}
              </h1>
              <p style={{ margin: '10px 0 0', color: C.grey, fontSize: 16 }}>
                {car.city}
                {car.ownersCount
                  ? ` · ${car.ownersCount} owner${car.ownersCount > 1 ? 's' : ''}`
                  : ''}
                {car.odometerKm ? ` · ${car.odometerKm.toLocaleString('en-IN')} km` : ''}
              </p>
            </div>

            {/* Key facts */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(115px,1fr))',
                gap: 1,
                background: C.border,
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                overflow: 'hidden',
                marginTop: 22,
              }}
            >
              {keyFacts.map((k) => (
                <div key={k.label} style={{ background: '#fff', padding: '16px 15px' }}>
                  <div style={{ fontSize: 12, color: C.grey, fontWeight: 600, marginBottom: 5 }}>
                    {k.label}
                  </div>
                  <div
                    style={{ fontFamily: display, fontSize: 16, fontWeight: 800, color: C.text }}
                  >
                    {k.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Fair Price Index + Risk Score */}
            <section style={{ marginTop: 34, display: 'grid', gap: 14 }}>
              {car.fairPriceLabel && (
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid ${C.border}`,
                    borderRadius: 22,
                    padding: 'clamp(18px,3vw,24px)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '.14em',
                      textTransform: 'uppercase',
                      color: C.grey,
                      marginBottom: 8,
                    }}
                  >
                    Fair Price Index
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontFamily: display,
                        fontWeight: 800,
                        fontSize: 20,
                        color: FPI_COLOR[car.fairPriceLabel] ?? C.indigo,
                      }}
                    >
                      {FPI_LABEL[car.fairPriceLabel] ?? 'Fair price'}
                    </span>
                    {car.valuationFair ? (
                      <span style={{ color: C.grey, fontSize: 14 }}>
                        Fair market value ~{inr(car.valuationFair)}
                      </span>
                    ) : null}
                  </div>
                  {car.valuationFair && car.price ? (
                    <p
                      style={{
                        margin: '12px 0 0',
                        color: C.text,
                        fontSize: 14.5,
                        lineHeight: 1.55,
                      }}
                    >
                      Negotiation target:{' '}
                      <strong>
                        {inr(Math.round(car.valuationFair * 0.95))}–{inr(car.valuationFair)}
                      </strong>{' '}
                      based on fair value.{' '}
                      <Link
                        href="/methodology/fair-price"
                        style={{ color: C.coral, fontWeight: 600 }}
                      >
                        How we calculate this →
                      </Link>
                    </p>
                  ) : null}
                </div>
              )}

              {car.riskScore != null && (
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid ${C.border}`,
                    borderRadius: 22,
                    padding: 'clamp(18px,3vw,24px)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '.14em',
                      textTransform: 'uppercase',
                      color: C.grey,
                      marginBottom: 10,
                    }}
                  >
                    Risk score
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div
                      style={{
                        fontFamily: display,
                        fontWeight: 800,
                        fontSize: 30,
                        color: RISK_COLOR[car.riskBand ?? 'MODERATE'],
                      }}
                    >
                      {car.riskScore}
                      <span style={{ fontSize: 16, color: C.grey }}>/10</span>
                    </div>
                    <span
                      style={{
                        background: C.tint,
                        color: RISK_COLOR[car.riskBand ?? 'MODERATE'],
                        fontWeight: 800,
                        fontSize: 13,
                        padding: '6px 13px',
                        borderRadius: 999,
                      }}
                    >
                      {RISK_LABEL[car.riskBand ?? 'MODERATE']}
                    </span>
                  </div>
                  {car.riskFactors && car.riskFactors.length > 0 ? (
                    <ul
                      style={{
                        margin: '14px 0 0',
                        paddingLeft: 18,
                        color: C.text,
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      {car.riskFactors.map((f) => (
                        <li key={f.key}>{f.label}</li>
                      ))}
                    </ul>
                  ) : (
                    <p
                      style={{
                        margin: '12px 0 0',
                        color: '#3B6B45',
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      No notable risk signals found.
                    </p>
                  )}
                  <p style={{ margin: '12px 0 0', fontSize: 12.5, color: C.grey }}>
                    Indicative only — always inspect before you buy.{' '}
                    <Link
                      href="/methodology/risk-score"
                      style={{ color: C.coral, fontWeight: 600 }}
                    >
                      Methodology →
                    </Link>
                  </p>
                </div>
              )}
            </section>

            {/* Inspection */}
            {insp && (
              <section style={{ marginTop: 34 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: C.grey,
                    marginBottom: 8,
                  }}
                >
                  Inspection report
                </div>
                <h2
                  style={{
                    fontFamily: display,
                    margin: '0 0 4px',
                    fontSize: 24,
                    fontWeight: 800,
                    color: C.indigo,
                    letterSpacing: '-.02em',
                  }}
                >
                  Exactly what we checked
                </h2>
                <p style={{ margin: '0 0 18px', color: C.grey, fontSize: 15 }}>
                  Scored by a Mana inspection.
                </p>
                <div
                  style={{
                    background: '#fff',
                    border: `1px solid ${C.border}`,
                    borderRadius: 22,
                    padding: 'clamp(20px,3vw,28px)',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, alignItems: 'center' }}>
                    <div
                      style={{ position: 'relative', width: 128, height: 128, flex: '0 0 auto' }}
                    >
                      <svg
                        width="128"
                        height="128"
                        viewBox="0 0 128 128"
                        style={{ transform: 'rotate(-90deg)' }}
                      >
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke={C.border}
                          strokeWidth="12"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke={C.indigo}
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${(score / 100) * circ} ${circ}`}
                        />
                      </svg>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: display,
                            fontSize: 36,
                            fontWeight: 800,
                            color: C.indigo,
                            lineHeight: 1,
                          }}
                        >
                          {score}
                        </span>
                        <span style={{ fontSize: 11.5, color: C.grey, fontWeight: 600 }}>
                          of 100
                        </span>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div
                        style={{
                          display: 'inline-block',
                          background: C.tint,
                          color: C.indigo,
                          fontWeight: 800,
                          fontSize: 13,
                          padding: '6px 13px',
                          borderRadius: 999,
                          marginBottom: 10,
                        }}
                      >
                        Grade {insp.grade}
                      </div>
                      <p style={{ margin: 0, color: C.text, fontSize: 15, lineHeight: 1.55 }}>
                        Inspected across engine, transmission, structure, interior, tyres and
                        electricals — full per-category scores below.
                      </p>
                    </div>
                  </div>
                  {insp.sectionScores && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                        gap: '16px 30px',
                        marginTop: 26,
                      }}
                    >
                      {Object.entries(insp.sectionScores).map(([k, val]) => (
                        <div key={k}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 14,
                              marginBottom: 7,
                            }}
                          >
                            <span style={{ fontWeight: 700, color: C.text }}>
                              {SECTION_LABEL[k] ?? k}
                            </span>
                            <span style={{ fontWeight: 700, color: C.grey }}>{val}</span>
                          </div>
                          <div
                            style={{
                              height: 8,
                              borderRadius: 999,
                              background: C.border,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                borderRadius: 999,
                                background: C.indigo,
                                width: `${val}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* History */}
            <section style={{ marginTop: 34 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: C.grey,
                  marginBottom: 8,
                }}
              >
                History &amp; records
              </div>
              <h2
                style={{
                  fontFamily: display,
                  margin: '0 0 4px',
                  fontSize: 24,
                  fontWeight: 800,
                  color: C.indigo,
                  letterSpacing: '-.02em',
                }}
              >
                Verified against VAHAN
              </h2>
              <p style={{ margin: '0 0 14px', color: C.grey, fontSize: 15 }}>
                No surprises after you buy.{' '}
                <Link href={`/listings/${id}/history`} style={{ color: C.coral, fontWeight: 600 }}>
                  View full history report →
                </Link>
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
                  gap: 12,
                }}
              >
                {history.map((h) => (
                  <div
                    key={h.label}
                    style={{
                      background: '#fff',
                      border: `1px solid ${C.border}`,
                      borderRadius: 16,
                      padding: '16px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 13,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>
                        {h.label}
                      </div>
                      <div style={{ fontSize: 12.5, color: C.grey }}>{h.value}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: h.ok ? C.indigo : C.coralDark,
                        background: h.ok ? C.tint : '#FBE9E6',
                        padding: '5px 11px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h.ok ? '✓' : '!'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Seller */}
            <section style={{ marginTop: 30 }}>
              <div
                style={{
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  borderRadius: 20,
                  padding: 20,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 15,
                    background: C.indigo,
                    color: C.cream,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: display,
                    fontWeight: 800,
                    fontSize: 20,
                  }}
                >
                  {(car.dealer?.displayName ?? 'M').charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{ fontFamily: display, fontWeight: 800, fontSize: 16, color: C.text }}
                    >
                      {car.dealer?.displayName ?? 'Verified dealer'}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: C.tint,
                        color: C.indigo,
                        fontWeight: 700,
                        fontSize: 11.5,
                        padding: '4px 10px',
                        borderRadius: 999,
                      }}
                    >
                      Tier {car.dealer?.verificationTier} · Verified dealer
                    </span>
                  </div>
                  <div style={{ fontSize: 13.5, color: C.grey, marginTop: 4 }}>
                    {car.dealer?.city ?? car.city} · KYC &amp; GST verified
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right: sticky price card */}
          <aside
            style={{ flex: '1 1 330px', maxWidth: 400, minWidth: 300, position: 'sticky', top: 96 }}
          >
            <div
              style={{
                background: '#fff',
                border: `1px solid ${C.border}`,
                borderRadius: 24,
                padding: 24,
                boxShadow: '0 16px 50px rgba(31,39,71,.09)',
              }}
            >
              <div style={{ fontSize: 13, color: C.grey, fontWeight: 600 }}>
                On-road price, all inclusive
              </div>
              <div
                style={{
                  fontFamily: display,
                  fontSize: 38,
                  fontWeight: 800,
                  color: C.indigo,
                  letterSpacing: '-.025em',
                  margin: '3px 0 6px',
                }}
              >
                {inr(price)}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: C.tint,
                  color: C.indigo,
                  fontWeight: 700,
                  fontSize: 12.5,
                  padding: '6px 12px',
                  borderRadius: 999,
                }}
              >
                {dealText}
                {car.valuationFair ? ` · fair ~${inr(car.valuationFair)}` : ''}
              </div>

              <div
                style={{
                  marginTop: 20,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    background: C.cream,
                    padding: '12px 16px',
                    fontWeight: 700,
                    fontSize: 13,
                    color: C.indigo,
                  }}
                >
                  No hidden charges · estimated breakdown
                </div>
                {[
                  ['Ex-showroom', exShowroom],
                  ['RTO & registration', rto],
                  ['Insurance', insurance],
                ].map(([l, val]) => (
                  <div
                    key={l as string}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '11px 16px',
                      fontSize: 13.5,
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    <span style={{ color: C.grey }}>{l}</span>
                    <span style={{ fontWeight: 700, color: C.text }}>{inr(val as number)}</span>
                  </div>
                ))}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '13px 16px',
                    fontSize: 14.5,
                    borderTop: `1.5px solid ${C.border}`,
                    background: C.cream,
                  }}
                >
                  <span style={{ fontWeight: 800, color: C.indigo }}>On-road total</span>
                  <span style={{ fontFamily: display, fontWeight: 800, color: C.indigo }}>
                    {inr(price)}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 18, background: C.cream, borderRadius: 16, padding: 17 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{ fontFamily: display, fontWeight: 800, fontSize: 14, color: C.indigo }}
                  >
                    EMI from
                  </span>
                  <span style={{ fontSize: 12, color: C.grey }}>@ 10.5% · 20% down · 60 mo</span>
                </div>
                <div
                  style={{
                    fontFamily: display,
                    fontSize: 30,
                    fontWeight: 800,
                    color: C.indigo,
                    margin: '8px 0 2px',
                    letterSpacing: '-.02em',
                  }}
                >
                  ₹{monthly.toLocaleString('en-IN')}
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.grey }}> /mo</span>
                </div>
                <Link
                  href={`/listings/${id}/finance`}
                  style={{
                    color: C.coral,
                    fontWeight: 700,
                    fontSize: 13.5,
                    textDecoration: 'none',
                  }}
                >
                  Apply for finance →
                </Link>
              </div>

              <div style={{ marginTop: 18 }}>
                <BuyerActions vehicleId={car.id} />
              </div>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                <CompareButton id={car.id} variant="inline" />
              </div>
            </div>
          </aside>
        </div>
      </main>
      <CompareTray />
    </div>
  );
}
