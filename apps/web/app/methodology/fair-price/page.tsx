import Link from 'next/link';
import SiteHeader from '../../components/site-header';
import { C, display, h1, card } from '../../../lib/ds';

export const metadata = { title: 'Fair Price Index methodology · Mana' };

export default function FairPriceMethodology() {
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
          How the Fair Price Index works
        </h1>
        <p style={{ color: C.grey, fontSize: 16, margin: '10px 0 22px', lineHeight: 1.6 }}>
          Every car gets a fair-market estimate so you can tell a genuine deal from an inflated ask
          — before you negotiate.
        </p>

        <div style={{ ...card, marginBottom: 16 }}>
          <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, margin: '0 0 8px' }}>
            What goes in
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: C.text, fontSize: 15, lineHeight: 1.7 }}>
            <li>Make, model and variant</li>
            <li>Manufacture year and age-based depreciation</li>
            <li>Kilometres driven vs. expected usage</li>
            <li>City / market and current demand</li>
            <li>Ownership count and condition signals</li>
          </ul>
        </div>

        <div style={{ ...card, marginBottom: 16 }}>
          <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, margin: '0 0 8px' }}>
            The label
          </h2>
          <p style={{ margin: 0, color: C.text, fontSize: 15, lineHeight: 1.7 }}>
            We compare the asking price to the fair estimate and show one of three labels. Within{' '}
            <strong>±10%</strong> of fair is <strong>Fair price</strong>; more than 10% below is{' '}
            <strong>Underpriced</strong>; more than 10% above is <strong>Above market</strong>. We
            also suggest a negotiation target around the fair value.
          </p>
        </div>

        <div style={{ ...card, background: C.cream2 }}>
          <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, margin: '0 0 8px' }}>
            Important
          </h2>
          <p style={{ margin: 0, color: C.text, fontSize: 15, lineHeight: 1.7 }}>
            The Fair Price Index is <strong>indicative</strong>, not a guarantee or an offer.
            Condition, paperwork and history vary car to car — always inspect and verify before you
            buy.
          </p>
        </div>
      </main>
    </div>
  );
}
