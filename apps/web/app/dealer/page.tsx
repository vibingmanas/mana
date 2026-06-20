'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../lib/api';

interface Dashboard {
  dealer: { verificationTier: string };
  liveListings: number;
  newLeads: number;
  upcomingAppointments: number;
  salesThisMonth: number;
  stockByStatus: Record<string, number>;
  leadsByStatus: Record<string, number>;
}

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

export default function DealerHome() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [d, setD] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setAuthed(!!getToken()), []);
  useEffect(() => {
    if (authed)
      api<Dashboard>('/dealer/dashboard', { auth: true })
        .then(setD)
        .catch((e) => setError(errMsg(e)));
  }, [authed]);

  if (authed === null) return <Shell>Loading…</Shell>;
  if (!authed)
    return (
      <Shell>
        <p>
          <Link href="/dealer/onboarding">Sign in / onboard as a dealer</Link> to see your
          dashboard.
        </p>
      </Shell>
    );

  return (
    <Shell>
      <h1>Dealer dashboard</h1>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {d && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
            <Stat label="Live listings" value={d.liveListings} />
            <Stat label="New leads" value={d.newLeads} />
            <Stat label="Upcoming visits" value={d.upcomingAppointments} />
            <Stat label="Sales this month" value={d.salesThisMonth} />
            <Stat label="Tier" value={d.dealer.verificationTier} />
          </div>
          <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <NavCard href="/dealer/cars" title="Inventory" desc="Add & manage cars" />
            <NavCard href="/dealer/leads" title="Leads / CRM" desc="Buyer enquiries" />
            <NavCard href="/dealer/appointments" title="Appointments" desc="Test drives & visits" />
            <NavCard href="/dealer/onboarding" title="Verification" desc="KYC & tier" />
          </nav>
        </>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        minWidth: 130,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</div>
    </div>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      style={{
        background: 'var(--card)',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        textDecoration: 'none',
        color: 'var(--fg)',
        minWidth: 160,
      }}
    >
      <strong>{title}</strong>
      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{desc}</div>
    </Link>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '2.5rem 1.5rem' }}>{children}</main>
  );
}
