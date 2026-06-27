import Link from 'next/link';
import SiteHeader from '../components/site-header';
import { C, display, h1, card } from '../../lib/ds';

export const metadata = { title: 'Guides & market reports · Mana' };

const LINKS = [
  ['Fair Price Index — how it works', '/methodology/fair-price'],
  ['Risk Score — how it works', '/methodology/risk-score'],
];

const GUIDES = [
  {
    q: 'How used-car buying works on Mana',
    a: 'Browse cars from dealers, owners and auctions in one place. Every listing shows a fair-price label and a 1–10 risk score. Shortlist and compare up to four cars side by side, book a free inspection or test drive, then let us handle finance and RC transfer end to end.',
  },
  {
    q: 'How bank & government car auctions work',
    a: 'Banks, NBFCs and government bodies auction seized or repossessed vehicles, often below market. Each lot has a guide price and a reserve. Carry your PAN, Aadhaar and an EMD demand draft. Auction cars are sold as-is — check the risk score and consider our bidding advisory before you commit.',
  },
  {
    q: 'RC transfer & documentation, explained',
    a: 'Ownership transfer (RC), NOC for interstate moves, and hypothecation removal can be done online and at the RTO. Mana handles the paperwork for you — Form 29/30, NOC, insurance transfer — as a single package so you never queue at the RTO.',
  },
  {
    q: 'Insurance & finance for used cars',
    a: 'Comprehensive insurance for a used car typically runs 3–4% of value per year; we show an estimate on every listing. Loans cover up to ~80% of value over 1–7 years; get an instant EMI and apply online — most approvals come back the same day.',
  },
];

export default function Guides() {
  return (
    <div>
      <SiteHeader />
      <main
        style={{
          maxWidth: 820,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,32px) clamp(16px,4vw,40px) 90px',
        }}
      >
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
          Guides & reports
        </div>
        <h1 style={{ ...h1, fontSize: 'clamp(28px,4vw,40px)' }}>
          Buy and sell used cars with confidence
        </h1>
        <p style={{ color: C.grey, fontSize: 16, margin: '8px 0 24px', lineHeight: 1.6 }}>
          Plain-English guides to pricing, risk, auctions and paperwork — so you make the call, not
          the dealer.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
            gap: 12,
            marginBottom: 26,
          }}
        >
          {LINKS.map(([t, href]) => (
            <Link key={href} href={href} style={{ ...card, textDecoration: 'none' }}>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 16, color: C.indigo }}>
                {t}
              </div>
              <div style={{ color: C.coral, fontWeight: 700, fontSize: 13, marginTop: 8 }}>
                Read →
              </div>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {GUIDES.map((g) => (
            <details key={g.q} style={{ ...card }}>
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
                {g.q}
              </summary>
              <p style={{ margin: '12px 0 0', color: C.text, fontSize: 15, lineHeight: 1.65 }}>
                {g.a}
              </p>
            </details>
          ))}
        </div>
      </main>
    </div>
  );
}
