import Link from 'next/link';
import { notFound } from 'next/navigation';
import BuyerActions from './buyer-actions';

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
  city: string | null;
  media: { url: string; type: string }[];
  verification: {
    verifiedAt: string | null;
    rcStatus: string | null;
    insuranceValidTill: string | null;
    pucValidTill: string | null;
    hypothecationActive: boolean | null;
    challanCount: number | null;
  } | null;
  dealer: { displayName: string | null; city: string | null; verificationTier: string } | null;
}

async function getListing(id: string): Promise<Listing | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const res = await fetch(`${base}/api/listings/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as Listing;
}

function inr(n: number | null): string {
  if (!n) return '—';
  return n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${n.toLocaleString('en-IN')}`;
}

function dealLabel(score: number | null): { text: string; color: string } | null {
  if (score == null) return null;
  if (score >= 0.08) return { text: 'Great deal', color: 'var(--accent)' };
  if (score >= -0.05) return { text: 'Fair price', color: '#9aa4b2' };
  return { text: 'Above market', color: '#f59e0b' };
}

export default async function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = await getListing(id);
  if (!car) notFound();

  const v = car.verification;
  const badges: { label: string; ok: boolean }[] = [
    { label: 'RC verified', ok: !!v?.verifiedAt },
    { label: 'No active loan', ok: v?.hypothecationActive === false },
    {
      label: 'Insurance valid',
      ok: !!v?.insuranceValidTill && new Date(v.insuranceValidTill) > new Date(),
    },
    { label: `${v?.challanCount ?? 0} challans`, ok: (v?.challanCount ?? 0) === 0 },
  ];

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <Link href="/listings" style={{ fontSize: 14 }}>
        ← Back to listings
      </Link>
      <div
        style={{
          height: 320,
          borderRadius: 12,
          marginTop: 16,
          background: car.media[0]
            ? `center/cover url(${car.media[0].url})`
            : 'rgba(255,255,255,0.05)',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 20,
        }}
      >
        <h1 style={{ margin: 0 }}>
          {car.manufactureYear ? `${car.manufactureYear} ` : ''}
          {car.make} {car.model}
        </h1>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 26, fontWeight: 700 }}>{inr(car.price)}</span>
          {(() => {
            const d = dealLabel(car.dealScore);
            return d ? (
              <div style={{ color: d.color, fontSize: 13, marginTop: 2 }}>
                {d.text}
                {car.valuationFair ? ` · fair ~${inr(car.valuationFair)}` : ''}
              </div>
            ) : null;
          })()}
        </div>
      </div>
      <p style={{ color: 'var(--muted)', marginTop: 4 }}>
        {car.variant} · {car.fuelType} · {car.transmission} · {car.color}
        {car.odometerKm ? ` · ${(car.odometerKm / 1000).toFixed(0)}k km` : ''}
        {car.ownersCount ? ` · ${car.ownersCount} owner(s)` : ''}
      </p>

      <section
        style={{ background: 'var(--card)', borderRadius: 12, padding: '1.25rem', marginTop: 20 }}
      >
        <strong>Trust &amp; verification</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {badges.map((b) => (
            <span
              key={b.label}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 13,
                background: b.ok ? 'rgba(45,212,191,0.18)' : 'rgba(248,113,113,0.15)',
                color: b.ok ? 'var(--accent)' : '#f87171',
              }}
            >
              {b.ok ? '✓' : '!'} {b.label}
            </span>
          ))}
        </div>
      </section>

      <section
        style={{ background: 'var(--card)', borderRadius: 12, padding: '1.25rem', marginTop: 16 }}
      >
        <strong>Dealer</strong>
        <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>
          {car.dealer?.displayName ?? 'Verified dealer'} · {car.dealer?.city ?? car.city} · Tier{' '}
          {car.dealer?.verificationTier}
        </p>
      </section>

      <BuyerActions vehicleId={car.id} />
    </main>
  );
}
