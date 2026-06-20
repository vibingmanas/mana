import Link from 'next/link';

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
  media: { url: string }[];
  verification: { verifiedAt: string | null } | null;
  certification: { tier: string } | null;
}

async function getFeatured(): Promise<Card[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/listings?limit=6&sort=recent`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: Card[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

function inr(n: number | null): string {
  if (!n) return '—';
  return n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${n.toLocaleString('en-IN')}`;
}

const CERT_LABEL: Record<string, string> = {
  SELF_DECLARED: 'Listed',
  AI_CHECKED: 'AI-checked',
  MANA_INSPECTED: 'Mana Inspected',
  MANA_CERTIFIED: 'Mana Certified',
};

export default async function Home() {
  const featured = await getFeatured();

  return (
    <div>
      {/* Nav */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <Link
          href="/"
          style={{ fontWeight: 800, fontSize: 22, color: 'var(--fg)', textDecoration: 'none' }}
        >
          Mana
        </Link>
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center', fontSize: 14 }}>
          <Link href="/listings">Browse cars</Link>
          <Link href="/dealer">For dealers</Link>
          <Link href="/admin" style={{ color: 'var(--muted)' }}>
            Admin
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '3.5rem 1.5rem 2.5rem',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '2.8rem',
            lineHeight: 1.1,
            margin: '0 0 1rem',
            letterSpacing: '-0.02em',
          }}
        >
          Used cars you can actually trust
        </h1>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '1.15rem',
            maxWidth: 620,
            margin: '0 auto 2rem',
          }}
        >
          Every car from a verified local dealer — RC-checked, inspected, odometer-validated, and
          finance-ready. The honest way to buy a second-hand car in India.
        </p>
        <form
          action="/listings"
          method="get"
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
            maxWidth: 640,
            margin: '0 auto',
          }}
        >
          <input
            name="make"
            placeholder="Search make e.g. Maruti, Hyundai…"
            style={{
              flex: '1 1 280px',
              padding: '14px 16px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'var(--card)',
              color: 'var(--fg)',
              fontSize: 16,
            }}
          />
          <button
            style={{
              padding: '14px 28px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent)',
              color: '#04201c',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>
        <div
          style={{
            display: 'flex',
            gap: 24,
            justifyContent: 'center',
            marginTop: 28,
            flexWrap: 'wrap',
            color: 'var(--muted)',
            fontSize: 14,
          }}
        >
          <span>✓ RC &amp; ownership verified</span>
          <span>✓ Odometer-fraud checked</span>
          <span>✓ Inspection grade</span>
          <span>✓ EMI from day one</span>
        </div>
      </section>

      {/* Featured */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem 1.5rem 3rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 22, margin: 0 }}>Latest cars</h2>
          <Link href="/listings" style={{ fontSize: 14 }}>
            View all →
          </Link>
        </div>

        {featured.length === 0 ? (
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 12,
              padding: '2rem',
              color: 'var(--muted)',
            }}
          >
            No cars listed yet. Dealers can <Link href="/dealer/onboarding">join and list</Link> in
            minutes.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {featured.map((c) => (
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
                    height: 160,
                    background: c.media[0]
                      ? `center/cover url(${c.media[0].url})`
                      : 'rgba(255,255,255,0.05)',
                  }}
                />
                <div style={{ padding: '0.9rem 1rem' }}>
                  <strong>
                    {c.manufactureYear ? `${c.manufactureYear} ` : ''}
                    {c.make} {c.model}
                  </strong>
                  <div style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0' }}>
                    {c.city ?? ''}
                    {c.odometerKm ? ` · ${(c.odometerKm / 1000).toFixed(0)}k km` : ''}
                    {c.fuelType ? ` · ${c.fuelType}` : ''}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 6,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 18 }}>{inr(c.price)}</span>
                    {c.certification && (
                      <span style={{ color: 'var(--accent)', fontSize: 12 }}>
                        {CERT_LABEL[c.certification.tier] ?? 'Listed'}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* For dealers */}
      <section style={{ background: 'var(--card)', marginTop: 8 }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '2.5rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h2 style={{ margin: '0 0 6px' }}>Are you a dealer?</h2>
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              List your inventory, get verified buyers, manage leads, and offer financing — all in
              one place.
            </p>
          </div>
          <Link
            href="/dealer/onboarding"
            style={{
              padding: '12px 22px',
              borderRadius: 10,
              background: 'var(--accent)',
              color: '#04201c',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Start selling
          </Link>
        </div>
      </section>

      <footer
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '2rem 1.5rem',
          color: 'var(--muted)',
          fontSize: 13,
        }}
      >
        Mana — organizing India&apos;s used-car dealers. Demo build.
      </footer>
    </div>
  );
}
