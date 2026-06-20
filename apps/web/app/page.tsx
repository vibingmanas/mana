import Link from 'next/link';
import SiteHeader from './components/site-header';
import { C, display, inr } from '../lib/ds';

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
  certification: { tier: string } | null;
}

async function getFeatured(): Promise<{ items: Card[]; total: number }> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/listings?limit=6&sort=recent`, { cache: 'no-store' });
    if (!res.ok) return { items: [], total: 0 };
    return (await res.json()) as { items: Card[]; total: number };
  } catch {
    return { items: [], total: 0 };
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

const CERT: Record<string, string> = {
  SELF_DECLARED: 'Listed',
  AI_CHECKED: 'AI-checked',
  MANA_INSPECTED: 'Mana Inspected',
  MANA_CERTIFIED: 'Mana Certified',
};

const BUDGETS = [
  { kicker: 'Starter', label: 'Under ₹5L', q: 'maxPrice=500000' },
  { kicker: 'Popular', label: '₹5L – ₹10L', q: 'minPrice=500000&maxPrice=1000000' },
  { kicker: 'Premium', label: '₹10L – ₹15L', q: 'minPrice=1000000&maxPrice=1500000' },
  { kicker: 'Luxury', label: '₹15L +', q: 'minPrice=1500000' },
];
const BODIES = ['Hatchback', 'SUV', 'Sedan', 'MUV'];
const WHY = [
  {
    num: '01',
    title: '200-point inspection',
    body: 'A Mana engineer checks every car. You see the full report before you buy.',
  },
  {
    num: '02',
    title: 'One honest price',
    body: 'Transparent on-road pricing — no haggling, no hidden charges at delivery.',
  },
  {
    num: '03',
    title: '7-day return window',
    body: 'Changed your mind? Return it within 7 days. No questions, no risk.',
  },
  {
    num: '04',
    title: 'Paperwork handled',
    body: 'Free RC transfer and ownership paperwork, done for you end to end.',
  },
];

export default async function Home() {
  const { items: featured, total } = await getFeatured();

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SiteHeader />

      {/* Hero */}
      <section
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(28px,5vw,64px) clamp(16px,4vw,40px) clamp(20px,3vw,40px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(28px,4vw,56px)',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: '1.15 1 360px', minWidth: 300 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: C.coral,
                marginBottom: 18,
              }}
            >
              India's most trusted used cars
            </div>
            <h1
              style={{
                fontFamily: display,
                margin: 0,
                fontSize: 'clamp(40px,6.4vw,76px)',
                lineHeight: 0.98,
                letterSpacing: '-.035em',
                fontWeight: 800,
                color: C.indigo,
              }}
            >
              Every car inspected.
              <br />
              Every price <span style={{ color: C.coral }}>honest.</span>
            </h1>
            <p
              style={{
                margin: '20px 0 0',
                color: C.grey,
                fontSize: 'clamp(16px,1.8vw,19px)',
                maxWidth: 480,
              }}
            >
              Buy a used car the calm way — verified condition, one transparent on-road price, and a
              7-day return window. No haggling, no surprises.
            </p>
            <form
              action="/listings"
              method="get"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#fff',
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                padding: '7px 7px 7px 20px',
                boxShadow: '0 12px 36px rgba(31,39,71,.08)',
                maxWidth: 520,
                marginTop: 28,
              }}
            >
              <input
                name="make"
                placeholder="Search Swift, Creta, Nexon…"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  background: 'none',
                  outline: 'none',
                  fontSize: 16,
                  color: C.text,
                }}
              />
              <button
                style={{
                  flex: '0 0 auto',
                  background: C.coral,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  padding: '13px 24px',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </form>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {['Maruti', 'Hyundai', 'Tata', 'Toyota'].map((b) => (
                <Link
                  key={b}
                  href={`/listings?make=${b}`}
                  style={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 999,
                    padding: '7px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.indigo,
                    textDecoration: 'none',
                  }}
                >
                  {b}
                </Link>
              ))}
            </div>
          </div>
          <div style={{ flex: '1 1 320px', minWidth: 280, position: 'relative' }}>
            <div
              style={{
                borderRadius: 26,
                overflow: 'hidden',
                aspectRatio: '4 / 4.4',
                background: C.indigo,
                boxShadow: '0 30px 70px rgba(31,39,71,.18)',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=74&auto=format&fit=crop"
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                left: -6,
                bottom: 24,
                background: 'rgba(255,255,255,.92)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                padding: '15px 18px',
                boxShadow: '0 16px 40px rgba(31,39,71,.16)',
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                maxWidth: 248,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  background: C.tint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '0 0 auto',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.indigo}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 800,
                    fontSize: 16,
                    color: C.indigo,
                    lineHeight: 1.1,
                  }}
                >
                  200-point inspection
                </div>
                <div style={{ fontSize: 12.5, color: C.grey }}>Passed on every listed car</div>
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'clamp(20px,4vw,44px)',
            marginTop: 'clamp(34px,4vw,52px)',
            paddingTop: 'clamp(24px,3vw,32px)',
            borderTop: `1px solid ${C.border}`,
          }}
        >
          {[
            [`${total}+`, 'Inspected cars live'],
            ['200', 'Inspection points'],
            ['7-day', 'Return window'],
            ['Free', 'RC transfer'],
          ].map(([v, l]) => (
            <div key={l} style={{ flex: '1 1 140px' }}>
              <div
                style={{
                  fontFamily: display,
                  fontSize: 'clamp(26px,3vw,34px)',
                  fontWeight: 800,
                  color: C.indigo,
                  letterSpacing: '-.02em',
                  lineHeight: 1,
                }}
              >
                {v}
              </div>
              <div style={{ fontSize: 13.5, color: C.grey, marginTop: 5 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Budget */}
      <section
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(30px,4vw,48px) clamp(16px,4vw,40px) 0',
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: C.grey,
              marginBottom: 8,
            }}
          >
            Shop by budget
          </div>
          <h2
            style={{
              fontFamily: display,
              margin: 0,
              fontSize: 'clamp(24px,3vw,32px)',
              fontWeight: 800,
              letterSpacing: '-.02em',
              color: C.indigo,
            }}
          >
            Find your price, first
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
            gap: 14,
          }}
        >
          {BUDGETS.map((t) => (
            <Link
              key={t.label}
              href={`/listings?${t.q}`}
              style={{
                position: 'relative',
                background: '#fff',
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: '22px 22px 20px',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: C.grey,
                }}
              >
                {t.kicker}
              </div>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 24,
                  color: C.indigo,
                  letterSpacing: '-.02em',
                  marginTop: 8,
                }}
              >
                {t.label}
              </div>
              <div style={{ fontSize: 13, color: C.grey, marginTop: 3 }}>Browse →</div>
            </Link>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 16,
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13.5, color: C.grey, fontWeight: 600, marginRight: 4 }}>
            Or by type:
          </span>
          {BODIES.map((b) => (
            <Link
              key={b}
              href={`/listings?body=${b}`}
              style={{
                background: '#fff',
                border: `1px solid ${C.border}`,
                borderRadius: 999,
                padding: '9px 16px',
                fontSize: 14,
                fontWeight: 700,
                color: C.indigo,
                textDecoration: 'none',
              }}
            >
              {b}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured rail */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(36px,5vw,60px) 0 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 20,
            padding: '0 clamp(16px,4vw,40px)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: C.grey,
                marginBottom: 8,
              }}
            >
              Freshly inspected
            </div>
            <h2
              style={{
                fontFamily: display,
                margin: 0,
                fontSize: 'clamp(24px,3vw,32px)',
                fontWeight: 800,
                letterSpacing: '-.02em',
                color: C.indigo,
              }}
            >
              Ready to drive home
            </h2>
          </div>
          <Link
            href="/listings"
            style={{
              fontSize: 14.5,
              fontWeight: 700,
              color: C.coral,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            See all →
          </Link>
        </div>
        {featured.length === 0 ? (
          <div style={{ padding: '0 clamp(16px,4vw,40px)', color: C.grey }}>
            No cars listed yet.
          </div>
        ) : (
          <div
            className="mana-scroll"
            style={{
              display: 'flex',
              gap: 18,
              overflowX: 'auto',
              padding: '4px clamp(16px,4vw,40px) 18px',
            }}
          >
            {featured.map((c) => (
              <Link
                key={c.id}
                href={`/listings/${c.id}`}
                style={{
                  flex: '0 0 clamp(280px,80vw,330px)',
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  borderRadius: 22,
                  overflow: 'hidden',
                  textDecoration: 'none',
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '16 / 11', background: C.tint }}>
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
                <div style={{ padding: '17px 19px 19px' }}>
                  <div
                    style={{ fontFamily: display, fontWeight: 800, fontSize: 18, color: C.text }}
                  >
                    {c.manufactureYear} {c.make} {c.model}
                  </div>
                  <div style={{ fontSize: 13.5, color: C.grey, marginTop: 5 }}>
                    {c.city}
                    {c.odometerKm ? ` · ${(c.odometerKm / 1000).toFixed(0)}k km` : ''}
                    {c.fuelType ? ` · ${c.fuelType}` : ''}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      marginTop: 16,
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: display,
                          fontWeight: 800,
                          fontSize: 22,
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
      </section>

      {/* Why Mana */}
      <section style={{ marginTop: 'clamp(40px,5vw,64px)', background: C.indigo, color: C.cream }}>
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: 'clamp(40px,6vw,76px) clamp(16px,4vw,40px)',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: '#FFB7AC',
              marginBottom: 16,
            }}
          >
            Why Mana
          </div>
          <h2
            style={{
              fontFamily: display,
              margin: '0 0 14px',
              fontSize: 'clamp(28px,4vw,48px)',
              fontWeight: 800,
              letterSpacing: '-.025em',
              lineHeight: 1.04,
              maxWidth: 680,
            }}
          >
            Everything that makes buying a used car scary — handled.
          </h2>
          <p
            style={{
              margin: '0 0 clamp(32px,4vw,52px)',
              color: 'rgba(250,246,239,.7)',
              fontSize: 'clamp(15px,1.8vw,18px)',
              maxWidth: 520,
            }}
          >
            No pushy dealer lot. Just a calm, transparent process with the paperwork done for you.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
              gap: 1,
              background: 'rgba(250,246,239,.14)',
              border: '1px solid rgba(250,246,239,.14)',
              borderRadius: 22,
              overflow: 'hidden',
            }}
          >
            {WHY.map((w) => (
              <div key={w.num} style={{ background: C.indigo, padding: 'clamp(24px,3vw,32px)' }}>
                <div
                  style={{
                    fontFamily: display,
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#FFB7AC',
                    letterSpacing: '.04em',
                  }}
                >
                  {w.num}
                </div>
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 800,
                    fontSize: 18,
                    color: C.cream,
                    margin: '18px 0 7px',
                  }}
                >
                  {w.title}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(250,246,239,.68)', lineHeight: 1.55 }}>
                  {w.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '2rem clamp(16px,4vw,40px)',
          color: C.grey,
          fontSize: 13,
        }}
      >
        Mana — organizing India&apos;s used-car dealers.{' '}
        <Link href="/dealer" style={{ color: C.coral }}>
          For dealers
        </Link>{' '}
        ·{' '}
        <Link href="/admin" style={{ color: C.grey }}>
          Admin
        </Link>
      </footer>
    </div>
  );
}
