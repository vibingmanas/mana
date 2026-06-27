import Link from 'next/link';
import SiteHeader from './components/site-header';
import { C, display, inr, eyebrow, btnPrimary, btnGhost } from '../lib/ds';

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

const STEPS = [
  {
    n: '1',
    title: 'Browse inspected cars',
    body: 'Filter by budget, body type or brand. Every listing shows its inspection grade and one on-road price.',
  },
  {
    n: '2',
    title: 'Book a free test drive',
    body: 'Pick a slot at the dealer or at home. See the full 200-point report before you commit.',
  },
  {
    n: '3',
    title: 'Finance & paperwork',
    body: 'Get an instant EMI plan from our lending partners. We handle RC transfer and insurance.',
  },
  {
    n: '4',
    title: 'Drive home — or return',
    body: 'Take delivery with confidence. Not the one? Return within 7 days, full refund.',
  },
];

const INSPECT = [
  { t: 'Engine & transmission', d: 'Cold start, oil leaks, gearbox, clutch wear' },
  { t: 'Structure & frame', d: 'Accident history, weld lines, repaint, rust' },
  { t: 'Brakes & suspension', d: 'Pad life, discs, shockers, alignment' },
  { t: 'Electricals & AC', d: 'Battery, wiring, infotainment, cooling' },
  { t: 'Tyres & wheels', d: 'Tread depth, age, alloy condition, spare' },
  { t: 'Documents & odometer', d: 'RC, insurance, challans, tamper check vs VAHAN' },
];

const QUOTES = [
  {
    q: 'I saw the full inspection report before paying a rupee. No dealer ever showed me that. Booked the same evening.',
    name: 'Priya R.',
    where: 'Bought a Creta · Hyderabad',
  },
  {
    q: 'Price on the site was the price I paid. RC transfer was done in a week without me visiting the RTO once.',
    name: 'Arjun M.',
    where: 'Bought a Nexon · Bengaluru',
  },
  {
    q: 'Sold my old Swift in two days. Three dealers bid, I picked the best offer. Money hit my account next morning.',
    name: 'Fatima S.',
    where: 'Sold a Swift · Pune',
  },
];

const FAQS = [
  {
    q: 'Are the cars really inspected?',
    a: 'Yes. Every car goes through a 200-point physical inspection by a Mana engineer. The full report — including any defects — is attached to the listing before you buy.',
  },
  {
    q: 'Is the price negotiable?',
    a: 'We show one transparent on-road price with no hidden delivery charges. What you see is what you pay.',
  },
  {
    q: 'What if I don’t like the car after buying?',
    a: 'Return it within 7 days for a full refund — no questions asked.',
  },
  {
    q: 'Can you arrange a loan?',
    a: 'Yes. Get an instant EMI estimate on any listing and apply to our lending partners online. Most approvals come back the same day.',
  },
  {
    q: 'Who handles the RC transfer?',
    a: 'We do — end to end. Ownership transfer, insurance and paperwork are handled for you, free.',
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
              India's used-car transparency platform
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
              Every car compared.
              <br />
              Every price <span style={{ color: C.coral }}>fair.</span>
            </h1>
            <p
              style={{
                margin: '20px 0 0',
                color: C.grey,
                fontSize: 'clamp(16px,1.8vw,19px)',
                maxWidth: 500,
              }}
            >
              Discover cars from dealers, owners and bank auctions in one place — each with a
              fair-price label, a 1–10 risk score and full history. Compare, decide, and let us
              handle inspection, finance and paperwork.
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

      {/* What we aggregate + intelligence */}
      <section
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,36px) clamp(16px,4vw,40px) 0',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
            gap: 12,
          }}
        >
          {[
            ['Dealer stock', 'Verified local dealers', '/listings?source=DEALER'],
            ['Owner cars', 'Direct from owners', '/listings?source=INDIVIDUAL'],
            ['Bank auctions', 'Seized & repossessed', '/auctions'],
            ['Fair Price + Risk', 'On every single car', '/methodology/fair-price'],
          ].map(([t, d, href]) => (
            <Link
              key={t}
              href={href}
              style={{
                background: '#fff',
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                padding: '18px 18px',
                textDecoration: 'none',
              }}
            >
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 16, color: C.indigo }}>
                {t}
              </div>
              <div style={{ fontSize: 13, color: C.grey, marginTop: 4 }}>{d}</div>
              <div style={{ fontSize: 12.5, color: C.coral, fontWeight: 700, marginTop: 8 }}>
                Explore →
              </div>
            </Link>
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

      {/* How it works */}
      <section
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(40px,5vw,64px) clamp(16px,4vw,40px) 0',
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>How it works</div>
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
            From browsing to your driveway in 4 steps
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
            gap: 14,
          }}
        >
          {STEPS.map((s) => (
            <div
              key={s.n}
              style={{
                background: '#fff',
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: '22px 22px 24px',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: C.tint,
                  color: C.indigo,
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 17,
                  color: C.indigo,
                  margin: '16px 0 7px',
                }}
              >
                {s.title}
              </div>
              <div style={{ fontSize: 14, color: C.grey, lineHeight: 1.55 }}>{s.body}</div>
            </div>
          ))}
        </div>
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

      {/* Inspection deep-dive */}
      <section
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(40px,5vw,64px) clamp(16px,4vw,40px) 0',
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <div style={{ ...eyebrow, color: C.coral, marginBottom: 8 }}>The 200-point check</div>
          <h2
            style={{
              fontFamily: display,
              margin: 0,
              fontSize: 'clamp(24px,3vw,32px)',
              fontWeight: 800,
              letterSpacing: '-.02em',
              color: C.indigo,
              maxWidth: 620,
            }}
          >
            We check what you can’t see in a 10-minute test drive
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
            gap: 14,
          }}
        >
          {INSPECT.map((it) => (
            <div
              key={it.t}
              style={{
                background: '#fff',
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                padding: '18px 20px',
                display: 'flex',
                gap: 13,
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  flex: '0 0 auto',
                  marginTop: 2,
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  background: C.tint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.indigo}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12l4 4 10-10" />
                </svg>
              </span>
              <div>
                <div
                  style={{ fontFamily: display, fontWeight: 800, fontSize: 15.5, color: C.indigo }}
                >
                  {it.t}
                </div>
                <div style={{ fontSize: 13.5, color: C.grey, marginTop: 3, lineHeight: 1.5 }}>
                  {it.d}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Financing band */}
      <section
        style={{
          maxWidth: 1240,
          margin: 'clamp(40px,5vw,64px) auto 0',
          padding: '0 clamp(16px,4vw,40px)',
        }}
      >
        <div
          style={{
            background: C.cream2,
            border: `1px solid ${C.border}`,
            borderRadius: 26,
            padding: 'clamp(28px,4vw,48px)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'clamp(24px,4vw,48px)',
          }}
        >
          <div style={{ flex: '1.3 1 320px', minWidth: 280 }}>
            <div style={{ ...eyebrow, marginBottom: 10 }}>Easy finance</div>
            <h2
              style={{
                fontFamily: display,
                margin: '0 0 12px',
                fontSize: 'clamp(24px,3.2vw,36px)',
                fontWeight: 800,
                letterSpacing: '-.025em',
                color: C.indigo,
              }}
            >
              Own it from ₹8,000/month
            </h2>
            <p
              style={{
                margin: 0,
                color: C.grey,
                fontSize: 'clamp(15px,1.7vw,17px)',
                maxWidth: 460,
              }}
            >
              Instant EMI estimates on every car, loans from leading banks and NBFCs, and approvals
              that usually land the same day. Down payments from 10%.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
              <Link href="/listings" style={{ ...btnPrimary, textDecoration: 'none' }}>
                Browse cars
              </Link>
              <Link href="/listings" style={{ ...btnGhost, textDecoration: 'none' }}>
                Calculate my EMI
              </Link>
            </div>
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 220, display: 'grid', gap: 12 }}>
            {[
              ['10.5%', 'Interest from (p.a.)'],
              ['Up to 7 yrs', 'Flexible tenure'],
              ['Same-day', 'Typical approval'],
            ].map(([v, l]) => (
              <div
                key={l}
                style={{
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span
                  style={{ fontFamily: display, fontWeight: 800, fontSize: 22, color: C.indigo }}
                >
                  {v}
                </span>
                <span style={{ fontSize: 13, color: C.grey, textAlign: 'right' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sell your car */}
      <section
        style={{
          maxWidth: 1240,
          margin: 'clamp(40px,5vw,64px) auto 0',
          padding: '0 clamp(16px,4vw,40px)',
        }}
      >
        <div
          style={{
            background: C.indigo,
            borderRadius: 26,
            padding: 'clamp(28px,4vw,48px)',
            color: C.cream,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'clamp(20px,3vw,40px)',
          }}
        >
          <div style={{ flex: '1 1 360px', minWidth: 280 }}>
            <div style={{ ...eyebrow, color: '#FFB7AC', marginBottom: 10 }}>Selling instead?</div>
            <h2
              style={{
                fontFamily: display,
                margin: '0 0 12px',
                fontSize: 'clamp(26px,3.6vw,42px)',
                fontWeight: 800,
                letterSpacing: '-.025em',
                lineHeight: 1.05,
              }}
            >
              Get 3 dealer offers in 24 hours
            </h2>
            <p
              style={{
                margin: 0,
                color: 'rgba(250,246,239,.72)',
                fontSize: 'clamp(15px,1.7vw,17px)',
                maxWidth: 460,
              }}
            >
              Tell us about your car, get a free price estimate, and let verified dealers compete.
              You pick the best offer — money in your account, paperwork on us.
            </p>
          </div>
          <Link
            href="/sell"
            style={{
              ...btnPrimary,
              background: C.coral,
              padding: '15px 28px',
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            Sell your car →
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(40px,5vw,64px) clamp(16px,4vw,40px) 0',
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>★★★★★ 4.8 / 5 from 2,000+ buyers</div>
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
            People who stopped worrying about used cars
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
            gap: 14,
          }}
        >
          {QUOTES.map((q) => (
            <figure
              key={q.name}
              style={{
                margin: 0,
                background: '#fff',
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: '24px 24px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ color: C.coral, fontSize: 15, letterSpacing: 2 }}>★★★★★</div>
              <blockquote
                style={{ margin: 0, color: C.text, fontSize: 16, lineHeight: 1.6, flex: 1 }}
              >
                “{q.q}”
              </blockquote>
              <figcaption style={{ fontSize: 13.5 }}>
                <span style={{ fontFamily: display, fontWeight: 800, color: C.indigo }}>
                  {q.name}
                </span>
                <span style={{ color: C.grey }}> · {q.where}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{
          maxWidth: 820,
          margin: '0 auto',
          padding: 'clamp(40px,5vw,64px) clamp(16px,4vw,40px) 0',
        }}
      >
        <h2
          style={{
            fontFamily: display,
            margin: '0 0 22px',
            fontSize: 'clamp(24px,3vw,32px)',
            fontWeight: 800,
            letterSpacing: '-.02em',
            color: C.indigo,
            textAlign: 'center',
          }}
        >
          Questions, answered
        </h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {FAQS.map((f) => (
            <details
              key={f.q}
              style={{
                background: '#fff',
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: '16px 20px',
              }}
            >
              <summary
                style={{
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 16,
                  color: C.indigo,
                  cursor: 'pointer',
                  listStyle: 'none',
                }}
              >
                {f.q}
              </summary>
              <p style={{ margin: '12px 0 0', color: C.grey, fontSize: 15, lineHeight: 1.6 }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section
        style={{
          maxWidth: 1240,
          margin: 'clamp(44px,6vw,76px) auto 0',
          padding: '0 clamp(16px,4vw,40px)',
        }}
      >
        <div
          style={{
            background: C.coral,
            borderRadius: 26,
            padding: 'clamp(36px,5vw,64px) clamp(24px,4vw,48px)',
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <h2
            style={{
              fontFamily: display,
              margin: '0 auto 14px',
              fontSize: 'clamp(28px,4vw,48px)',
              fontWeight: 800,
              letterSpacing: '-.025em',
              lineHeight: 1.04,
              maxWidth: 640,
            }}
          >
            Your next car is waiting — already inspected.
          </h2>
          <p
            style={{
              margin: '0 auto clamp(24px,3vw,32px)',
              fontSize: 'clamp(15px,1.8vw,18px)',
              color: 'rgba(255,255,255,.9)',
              maxWidth: 480,
            }}
          >
            {total}+ verified cars, one honest price, 7-day returns. Find yours today.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link
              href="/listings"
              style={{
                ...btnPrimary,
                background: '#fff',
                color: C.coralDark,
                padding: '15px 30px',
                fontSize: 16,
                textDecoration: 'none',
              }}
            >
              Browse cars
            </Link>
            <Link
              href="/sell"
              style={{
                ...btnPrimary,
                background: 'transparent',
                border: '1.5px solid rgba(255,255,255,.6)',
                padding: '15px 30px',
                fontSize: 16,
                textDecoration: 'none',
              }}
            >
              Sell your car
            </Link>
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
        Mana — India&apos;s used-car transparency & aggregation platform.{' '}
        <Link href="/auctions" style={{ color: C.coral }}>
          Auctions
        </Link>{' '}
        ·{' '}
        <Link href="/guides" style={{ color: C.coral }}>
          Guides
        </Link>{' '}
        ·{' '}
        <Link href="/dealer" style={{ color: C.coral }}>
          For dealers
        </Link>{' '}
        ·{' '}
        <Link href="/inspector" style={{ color: C.grey }}>
          Inspector
        </Link>{' '}
        ·{' '}
        <Link href="/admin" style={{ color: C.grey }}>
          Admin
        </Link>
      </footer>
    </div>
  );
}
