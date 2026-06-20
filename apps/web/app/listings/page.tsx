import Link from 'next/link';

interface ListingCard {
  id: string;
  make: string | null;
  model: string | null;
  variant: string | null;
  manufactureYear: number | null;
  odometerKm: number | null;
  price: number | null;
  city: string | null;
  fuelType: string | null;
  media: { url: string }[];
  verification: { verifiedAt: string | null; hypothecationActive: boolean | null } | null;
  dealer: { displayName: string | null; verificationTier: string } | null;
}

interface SearchResult {
  total: number;
  items: ListingCard[];
}

async function search(params: Record<string, string>): Promise<SearchResult> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${base}/api/listings${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
  if (!res.ok) return { total: 0, items: [] };
  return (await res.json()) as SearchResult;
}

function inr(n: number | null): string {
  if (!n) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default async function Listings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const params: Record<string, string> = {};
  for (const k of ['make', 'model', 'city', 'fuelType', 'minPrice', 'maxPrice']) {
    if (sp[k]) params[k] = sp[k];
  }
  const { total, items } = await search(params);

  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <h1 style={{ marginBottom: 4 }}>Used cars near you</h1>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>{total} verified listings</p>

      <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '1.5rem 0' }}>
        <input name="make" defaultValue={sp.make ?? ''} placeholder="Make" style={fInput} />
        <input name="model" defaultValue={sp.model ?? ''} placeholder="Model" style={fInput} />
        <input name="city" defaultValue={sp.city ?? ''} placeholder="City" style={fInput} />
        <input
          name="maxPrice"
          defaultValue={sp.maxPrice ?? ''}
          placeholder="Max ₹"
          style={fInput}
        />
        <button style={fBtn}>Search</button>
      </form>

      {items.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No cars match. Try widening your search.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/listings/${c.id}`}
              style={{
                background: 'var(--card)',
                borderRadius: 12,
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'var(--fg)',
              }}
            >
              <div
                style={{
                  height: 150,
                  background: c.media[0]
                    ? `center/cover url(${c.media[0].url})`
                    : 'rgba(255,255,255,0.05)',
                }}
              />
              <div style={{ padding: '0.9rem 1rem' }}>
                <strong>
                  {c.manufactureYear ? `${c.manufactureYear} ` : ''}
                  {c.make ?? 'Car'} {c.model ?? ''}
                </strong>
                <div style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0' }}>
                  {c.variant ?? ''}{' '}
                  {c.odometerKm ? `· ${(c.odometerKm / 1000).toFixed(0)}k km` : ''}{' '}
                  {c.fuelType ? `· ${c.fuelType}` : ''}
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontWeight: 700, fontSize: 18 }}>{inr(c.price)}</span>
                  {c.verification?.verifiedAt && (
                    <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓ RC verified</span>
                  )}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                  {c.city ?? ''} · {c.dealer?.displayName ?? 'Dealer'} ({c.dealer?.verificationTier}
                  )
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

const fInput: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#0b1020',
  color: 'var(--fg)',
};
const fBtn: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent)',
  color: '#04201c',
  fontWeight: 600,
  cursor: 'pointer',
};
