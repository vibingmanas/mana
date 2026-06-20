'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, display, h1, card, inr } from '../../../lib/ds';

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
      const r = await api<{ pending?: boolean; checkoutUrl?: string }>('/billing/subscribe', {
        method: 'POST',
        body: { planKey },
        auth: true,
      });
      if (r?.checkoutUrl) {
        window.location.href = r.checkoutUrl; // live Razorpay payment link
        return;
      }
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (authed === null) return <p style={{ color: C.grey }}>Loading…</p>;
  if (!authed)
    return (
      <p style={{ color: C.grey }}>
        Please{' '}
        <Link href="/dealer/onboarding" style={{ color: C.coral }}>
          sign in
        </Link>{' '}
        first.
      </p>
    );

  const limit = sub?.listingLimit ?? 3;
  const used = sub?.liveListings ?? 0;
  const pct = limit < 0 ? 8 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

  return (
    <section>
      <div style={{ marginBottom: 18 }}>
        <h1 style={h1}>Plans &amp; billing</h1>
        <p style={{ margin: '5px 0 0', color: C.grey, fontSize: 14.5 }}>
          You're on the {sub?.plan?.name ?? 'Starter'} plan
        </p>
      </div>
      {error && <p style={{ color: C.coralDark }}>{error}</p>}

      <div style={{ ...card, marginBottom: 18 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Live listings used</span>
          <span style={{ fontSize: 13.5, color: C.grey }}>
            <b style={{ color: C.indigo }}>{used}</b> of {limit < 0 ? '∞' : limit}
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: C.border, overflow: 'hidden' }}>
          <div
            style={{ height: '100%', borderRadius: 999, background: C.indigo, width: `${pct}%` }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {plans.map((p) => {
          const current = sub?.plan?.key === p.key || (!sub?.plan && p.key === 'starter');
          return (
            <div
              key={p.id}
              style={{
                ...card,
                position: 'relative',
                border: current ? `2px solid ${C.indigo}` : `1px solid ${C.border}`,
              }}
            >
              {current && (
                <span
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: C.tint,
                    color: C.indigo,
                    fontWeight: 800,
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  CURRENT
                </span>
              )}
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 19, color: C.indigo }}>
                {p.name}
              </div>
              <div style={{ margin: '10px 0 4px' }}>
                <span
                  style={{
                    fontFamily: display,
                    fontSize: 32,
                    fontWeight: 800,
                    color: C.indigo,
                    letterSpacing: '-.02em',
                  }}
                >
                  {p.priceMonthly === 0 ? 'Free' : inr(p.priceMonthly)}
                </span>
                {p.priceMonthly > 0 && (
                  <span style={{ fontSize: 13, color: C.grey }}>/mo + GST</span>
                )}
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 9, margin: '16px 0 18px' }}
              >
                {(p.features ?? []).map((f) => (
                  <div
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      fontSize: 13.5,
                      color: C.text,
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.coral}
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flex: '0 0 auto' }}
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
              <button
                disabled={busy || current}
                onClick={() => subscribe(p.key)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  border: 'none',
                  background: current ? C.border : C.indigo,
                  color: current ? C.grey : C.cream,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: current ? 'default' : 'pointer',
                }}
              >
                {current ? 'Current plan' : p.priceMonthly === 0 ? 'Select' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ ...card, borderRadius: 20, padding: 22 }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 800,
            fontSize: 17,
            color: C.indigo,
            marginBottom: 8,
          }}
        >
          GST invoices
        </div>
        {invoices.map((iv) => (
          <div
            key={iv.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '13px 4px',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>
                {new Date(iv.issuedAt).toLocaleDateString('en-IN')}
              </div>
              <div style={{ fontSize: 12.5, color: C.grey }}>incl. {inr(iv.gstAmount)} GST</div>
            </div>
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 15, color: C.indigo }}>
              {inr(iv.amount + iv.gstAmount)}
            </span>
            <span
              style={{
                background: C.tint,
                color: C.indigo,
                fontWeight: 700,
                fontSize: 11.5,
                padding: '4px 10px',
                borderRadius: 999,
              }}
            >
              {iv.status}
            </span>
          </div>
        ))}
        {invoices.length === 0 && (
          <p style={{ color: C.grey, margin: '8px 0 0' }}>No invoices yet.</p>
        )}
      </div>
    </section>
  );
}
