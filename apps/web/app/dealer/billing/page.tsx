'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';

interface Plan {
  id: string;
  key: string;
  name: string;
  priceMonthly: number;
  listingLimit: number;
  features: string[] | null;
}
interface SubInfo {
  plan: { key: string; name: string } | null;
  listingLimit: number;
  liveListings: number;
}
interface Invoice {
  id: string;
  amount: number;
  gstAmount: number;
  status: string;
  issuedAt: string;
}

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

export default function DealerBilling() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);
  async function load() {
    const [p, s, i] = await Promise.all([
      api<Plan[]>('/billing/plans'),
      api<SubInfo>('/billing/subscription', { auth: true }),
      api<Invoice[]>('/billing/invoices', { auth: true }),
    ]);
    setPlans(p);
    setSub(s);
    setInvoices(i);
  }
  useEffect(() => {
    if (authed) load().catch((e) => setError(errMsg(e)));
  }, [authed]);

  async function subscribe(planKey: string) {
    setBusy(true);
    setError(null);
    try {
      await api('/billing/subscribe', { method: 'POST', body: { planKey }, auth: true });
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (authed === null) return <Shell>Loading…</Shell>;
  if (!authed)
    return (
      <Shell>
        <p>
          Please <Link href="/dealer/onboarding">sign in as a dealer</Link> first.
        </p>
      </Shell>
    );

  return (
    <Shell>
      <h1>Plans &amp; billing</h1>
      {sub && (
        <p style={{ color: 'var(--muted)' }}>
          Current:{' '}
          <strong style={{ color: 'var(--fg)' }}>{sub.plan?.name ?? 'Starter (free)'}</strong> ·{' '}
          {sub.liveListings}/{sub.listingLimit < 0 ? '∞' : sub.listingLimit} live listings
        </p>
      )}
      {error && <p style={{ color: '#f87171' }}>{error}</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          margin: '20px 0',
        }}
      >
        {plans.map((p) => (
          <div
            key={p.id}
            style={{ background: 'var(--card)', borderRadius: 12, padding: '1.25rem' }}
          >
            <strong style={{ fontSize: 18 }}>{p.name}</strong>
            <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0' }}>
              {p.priceMonthly === 0 ? 'Free' : `₹${p.priceMonthly.toLocaleString('en-IN')}`}
              {p.priceMonthly > 0 && (
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>/mo + GST</span>
              )}
            </div>
            <ul style={{ color: 'var(--muted)', fontSize: 13, paddingLeft: 18, minHeight: 80 }}>
              {(p.features ?? []).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: 'none',
                background: sub?.plan?.key === p.key ? 'rgba(255,255,255,0.1)' : 'var(--accent)',
                color: sub?.plan?.key === p.key ? 'var(--muted)' : '#04201c',
                fontWeight: 600,
                cursor: sub?.plan?.key === p.key ? 'default' : 'pointer',
              }}
              disabled={busy || sub?.plan?.key === p.key}
              onClick={() => subscribe(p.key)}
            >
              {sub?.plan?.key === p.key
                ? 'Current plan'
                : p.priceMonthly === 0
                  ? 'Select'
                  : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18 }}>Invoices</h2>
      <div style={{ display: 'grid', gap: 6 }}>
        {invoices.map((i) => (
          <div key={i.id} style={{ fontSize: 13, color: 'var(--muted)' }}>
            {new Date(i.issuedAt).toLocaleDateString('en-IN')} · ₹
            {(i.amount + i.gstAmount).toLocaleString('en-IN')} (incl. ₹{i.gstAmount} GST) ·{' '}
            {i.status}
          </div>
        ))}
        {invoices.length === 0 && <p style={{ color: 'var(--muted)' }}>No invoices yet.</p>}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '2.5rem 1.5rem' }}>{children}</main>
  );
}
