import Link from 'next/link';
import SiteHeader from '../../components/site-header';
import { C, display, h1, card } from '../../../lib/ds';

export const metadata = { title: 'Risk Score methodology · Mana' };

const FACTORS = [
  ['Ownership count', 'More previous owners raises risk.'],
  ['Kilometres vs age', 'Unusually high yearly mileage adds risk.'],
  ['Vehicle age', 'Older cars carry more uncertainty.'],
  ['Accident / claim history', 'Recorded accidents or insurance claims raise risk.'],
  [
    'Seller type',
    'Auction / seized and private-party cars carry more unknowns than verified dealers.',
  ],
  ['RC & odometer checks', 'Unverified RC or suspected odometer tampering raises risk sharply.'],
  ['Inspection', 'A physical inspection on record lowers risk.'],
  ['Missing data', 'Gaps in history or specs add a caution penalty.'],
];

export default function RiskScoreMethodology() {
  return (
    <div>
      <SiteHeader />
      <main
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,32px) clamp(16px,4vw,40px) 90px',
        }}
      >
        <Link
          href="/listings"
          style={{ color: C.grey, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          ← Back
        </Link>
        <h1 style={{ ...h1, marginTop: 14, fontSize: 'clamp(26px,4vw,38px)' }}>
          How the Risk Score works
        </h1>
        <p style={{ color: C.grey, fontSize: 16, margin: '10px 0 22px', lineHeight: 1.6 }}>
          A single 1–10 score (lower = safer) distils the signals that usually trip up used-car
          buyers, mapped to Low / Moderate / High.
        </p>

        <div style={{ ...card, marginBottom: 16 }}>
          <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, margin: '0 0 8px' }}>
            Factors we weigh
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {FACTORS.map(([t, d]) => (
              <div key={t}>
                <strong style={{ color: C.text }}>{t}</strong>
                <span style={{ color: C.grey, fontSize: 14.5 }}> — {d}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, marginBottom: 16 }}>
          <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, margin: '0 0 8px' }}>
            Bands
          </h2>
          <p style={{ margin: 0, color: C.text, fontSize: 15, lineHeight: 1.7 }}>
            <strong>1–3 Low</strong>, <strong>4–6 Moderate</strong>, <strong>7–10 High</strong>.
            Each car's detail page lists the exact factors that contributed.
          </p>
        </div>

        <div style={{ ...card, background: C.cream2 }}>
          <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, margin: '0 0 8px' }}>
            Important
          </h2>
          <p style={{ margin: 0, color: C.text, fontSize: 15, lineHeight: 1.7 }}>
            The Risk Score is <strong>advisory</strong>, not a guarantee of condition. It helps you
            prioritise and ask better questions — a physical inspection and document check still
            matter.
          </p>
        </div>
      </main>
    </div>
  );
}
