import Link from 'next/link';
import { C, display } from '../../lib/ds';

export default function SiteHeader() {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 60, padding: '14px clamp(14px,3vw,32px) 0' }}>
      <header
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          background: 'rgba(255,255,255,.82)',
          backdropFilter: 'blur(18px)',
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: '9px 9px 9px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px,2vw,22px)',
          boxShadow: '0 8px 30px rgba(31,39,71,.07)',
        }}
      >
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
        >
          <span
            style={{
              width: 33,
              height: 33,
              borderRadius: 10,
              background: C.indigo,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.cream,
              fontFamily: display,
              fontWeight: 800,
              fontSize: 19,
            }}
          >
            m
          </span>
          <span
            style={{
              fontFamily: display,
              fontWeight: 800,
              fontSize: 21,
              letterSpacing: '-.02em',
              color: C.indigo,
            }}
          >
            mana
          </span>
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 6 }}>
          <Link
            href="/listings"
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              color: C.text,
              padding: '9px 13px',
              borderRadius: 11,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Buy a car
          </Link>
          <Link
            href="/dealer"
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              color: C.grey,
              padding: '9px 13px',
              borderRadius: 11,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            For dealers
          </Link>
        </nav>
        <div style={{ flex: 1 }} />
        <Link
          href="/listings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: C.indigo,
            color: C.cream,
            fontSize: 14.5,
            fontWeight: 700,
            padding: '11px 18px',
            borderRadius: 13,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Browse cars
        </Link>
      </header>
    </div>
  );
}
