'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import { C, display, body } from '../../lib/ds';

interface Status {
  dealer: { displayName: string | null; city: string | null; verificationTier: string };
}

const TABS = [
  { href: '/dealer', label: 'Dashboard' },
  { href: '/dealer/cars', label: 'Inventory' },
  { href: '/dealer/leads', label: 'Leads' },
  { href: '/dealer/appointments', label: 'Appointments' },
  { href: '/dealer/intelligence', label: 'Intelligence' },
  { href: '/dealer/tools', label: 'Tools' },
  { href: '/dealer/staff', label: 'Staff' },
  { href: '/dealer/financing', label: 'Financing' },
  { href: '/dealer/billing', label: 'Billing' },
  { href: '/dealer/onboarding', label: 'Verification' },
];

const TIER_LABEL: Record<string, string> = {
  T0: 'Registered',
  T1: 'Identity verified',
  T2: 'Business verified',
  T3: 'Mana Certified',
};

export default function DealerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    setAuthed(true);
    api<Status>('/onboarding/status', { auth: true })
      .then(setStatus)
      .catch(() => {});
  }, [pathname]);

  const tier = status?.dealer.verificationTier ?? 'T0';
  const name = status?.dealer.displayName ?? (authed ? 'Your dealership' : 'Sign in');
  const city = status?.dealer.city ?? 'Mana for dealers';
  const initial = (status?.dealer.displayName ?? 'M').charAt(0).toUpperCase();

  return (
    <div
      style={{
        fontFamily: body,
        background: C.cream,
        color: C.text,
        minHeight: '100vh',
        lineHeight: 1.5,
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255,255,255,.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '11px clamp(14px,3vw,32px)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Link
            href="/dealer"
            style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
          >
            <img
              src="/mana-emblem.svg"
              alt="Mana"
              width={36}
              height={36}
              style={{ display: 'block' }}
            />
            <span style={{ lineHeight: 1 }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: display,
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: '-.02em',
                  color: C.indigo,
                }}
              >
                mana
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: C.coral,
                  marginTop: 2,
                }}
              >
                For dealers
              </span>
            </span>
          </Link>
          <div style={{ flex: 1 }} />
          <span
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
              whiteSpace: 'nowrap',
            }}
          >
            <svg
              width="13"
              height="13"
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
            {TIER_LABEL[tier]}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: C.indigo,
                color: C.cream,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: display,
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              {initial}
            </span>
            <span style={{ lineHeight: 1.15 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: C.text,
                  whiteSpace: 'nowrap',
                }}
              >
                {name}
              </span>
              <span
                style={{ display: 'block', fontSize: 11.5, color: C.grey, whiteSpace: 'nowrap' }}
              >
                {city}
              </span>
            </span>
          </div>
        </div>
        <nav style={{ borderTop: `1px solid ${C.border}`, overflowX: 'auto' }}>
          <div
            style={{
              maxWidth: 1240,
              margin: '0 auto',
              padding: '0 clamp(10px,3vw,28px)',
              display: 'flex',
              gap: 2,
            }}
          >
            {TABS.map((t) => {
              const active =
                t.href === '/dealer' ? pathname === '/dealer' : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  style={{
                    padding: '13px 16px',
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    color: active ? C.indigo : C.grey,
                    borderBottom: `2px solid ${active ? C.coral : 'transparent'}`,
                  }}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,30px) clamp(14px,3vw,32px) 90px',
        }}
      >
        {children}
      </main>
    </div>
  );
}
