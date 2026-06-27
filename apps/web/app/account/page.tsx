'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '../components/site-header';
import OtpLogin from '../components/otp-login';
import { api, getToken, clearTokens, type ApiError } from '../../lib/api';
import { C, display, h1, card, btnPrimary, btnInk, btnGhost, inr } from '../../lib/ds';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

interface Account {
  subscription: { plan: string; status: string; currentPeriodEnd: string | null } | null;
  reports: {
    id: string;
    amount: number;
    vehicle: { id: string; make: string | null; model: string | null };
  }[];
  savedSearches: { id: string; query: Record<string, string>; alertChannel: string }[];
  leads: {
    id: string;
    intent: string;
    status: string;
    vehicle: { make: string | null; model: string | null } | null;
  }[];
  appointments: {
    id: string;
    status: string;
    scheduledStart: string;
    vehicle: { make: string | null; model: string | null } | null;
  }[];
  finance: {
    id: string;
    amount: number;
    status: string;
    vehicle: { make: string | null; model: string | null } | null;
  }[];
  sells: { id: string; make: string | null; model: string | null; status: string }[];
}

export default function AccountPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [acc, setAcc] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);
  const load = async () => setAcc(await api<Account>('/buyer/account', { auth: true }));
  useEffect(() => {
    if (authed) load().catch((e) => setError(errMsg(e)));
  }, [authed]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (authed === null) return null;
  if (!authed)
    return (
      <div>
        <SiteHeader />
        <OtpLogin
          title="Your account"
          subtitle="Sign in to see saved cars, alerts, reports and bookings."
          role="BUYER"
          onAuthed={() => setAuthed(true)}
        />
      </div>
    );

  const pro = acc?.subscription?.status === 'ACTIVE';

  return (
    <div>
      <SiteHeader />
      <main
        style={{
          maxWidth: 920,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,32px) clamp(16px,4vw,40px) 90px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <h1 style={{ ...h1, fontSize: 'clamp(26px,4vw,38px)' }}>Your account</h1>
          <button
            style={{ ...btnGhost, padding: '8px 14px' }}
            onClick={() => {
              clearTokens();
              setAuthed(false);
            }}
          >
            Sign out
          </button>
        </div>
        {error && <p style={{ color: C.coralDark }}>{error}</p>}

        {/* Pro */}
        <div
          style={{
            ...card,
            marginTop: 18,
            background: pro ? C.cream2 : C.indigo,
            color: pro ? C.text : C.cream,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 20 }}>
                {pro ? 'Mana Pro — active' : 'Upgrade to Mana Pro'}
              </div>
              <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
                {pro
                  ? `Renews ${acc?.subscription?.currentPeriodEnd ? new Date(acc.subscription.currentPeriodEnd).toLocaleDateString('en-IN') : ''} · free history reports, advanced insights, priority support`
                  : 'Advanced filters & insights, free history reports, price alerts, advisory — ₹299/mo'}
              </div>
            </div>
            {pro ? (
              <button
                style={btnGhost}
                disabled={busy}
                onClick={() => act(() => api('/buyer/pro/cancel', { method: 'POST', auth: true }))}
              >
                Cancel
              </button>
            ) : (
              <button
                style={{ ...btnPrimary, background: C.coral }}
                disabled={busy}
                onClick={() =>
                  act(() => api('/buyer/pro/subscribe', { method: 'POST', auth: true }))
                }
              >
                Go Pro
              </button>
            )}
          </div>
        </div>

        <Section title="History reports">
          {acc && acc.reports.length > 0 ? (
            acc.reports.map((r) => (
              <Row
                key={r.id}
                left={`${r.vehicle.make} ${r.vehicle.model}`}
                right={r.amount === 0 ? 'Free (Pro)' : inr(r.amount)}
                href={`/listings/${r.vehicle.id}/history`}
              />
            ))
          ) : (
            <Empty>No reports purchased yet.</Empty>
          )}
        </Section>

        <Section title="Saved searches & alerts">
          {acc && acc.savedSearches.length > 0 ? (
            acc.savedSearches.map((s) => (
              <div key={s.id} style={rowStyle}>
                <span style={{ color: C.text, fontSize: 14 }}>
                  {Object.entries(s.query)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' · ') || 'All cars'}
                  {s.alertChannel !== 'none' ? ` · alerts: ${s.alertChannel}` : ''}
                </span>
                <button
                  style={{ ...btnGhost, padding: '6px 12px' }}
                  disabled={busy}
                  onClick={() =>
                    act(() =>
                      api(`/buyer/saved-searches/${s.id}`, { method: 'DELETE', auth: true }),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <Empty>No saved searches. Save one from the search page.</Empty>
          )}
        </Section>

        <Section title="Enquiries & test drives">
          {acc && (acc.leads.length > 0 || acc.appointments.length > 0) ? (
            <>
              {acc.appointments.map((a) => (
                <Row
                  key={a.id}
                  left={`Test drive · ${a.vehicle?.make ?? ''} ${a.vehicle?.model ?? ''}`}
                  right={`${a.status.toLowerCase()} · ${new Date(a.scheduledStart).toLocaleDateString('en-IN')}`}
                />
              ))}
              {acc.leads.map((l) => (
                <Row
                  key={l.id}
                  left={`${l.intent.replace('_', ' ').toLowerCase()} · ${l.vehicle?.make ?? ''} ${l.vehicle?.model ?? ''}`}
                  right={l.status.toLowerCase()}
                />
              ))}
            </>
          ) : (
            <Empty>No enquiries yet.</Empty>
          )}
        </Section>

        <Section title="Finance & sell">
          {acc && (acc.finance.length > 0 || acc.sells.length > 0) ? (
            <>
              {acc.finance.map((f) => (
                <Row
                  key={f.id}
                  left={`Loan · ${f.vehicle?.make ?? ''} ${f.vehicle?.model ?? ''}`}
                  right={`${inr(f.amount)} · ${f.status.toLowerCase()}`}
                />
              ))}
              {acc.sells.map((s) => (
                <Row
                  key={s.id}
                  left={`Selling · ${s.make ?? ''} ${s.model ?? ''}`}
                  right={s.status.toLowerCase().replace('_', ' ')}
                  href="/sell/offers"
                />
              ))}
            </>
          ) : (
            <Empty>No finance or sell activity yet.</Empty>
          )}
        </Section>
      </main>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  padding: '11px 0',
  borderTop: `1px solid ${C.border}`,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...card, marginTop: 16 }}>
      <h2 style={{ fontFamily: display, fontSize: 16, color: C.indigo, margin: '0 0 6px' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
function Row({ left, right, href }: { left: string; right: string; href?: string }) {
  const content = (
    <div style={rowStyle}>
      <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{left}</span>
      <span style={{ color: C.grey, fontSize: 13.5 }}>{right}</span>
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  ) : (
    content
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ color: C.grey, fontSize: 14, margin: '8px 0 0' }}>{children}</p>;
}
