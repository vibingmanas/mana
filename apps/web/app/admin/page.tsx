'use client';

import { useEffect, useState } from 'react';
import { api, getToken, setTokens, type ApiError } from '../../lib/api';

interface Dealer {
  id: string;
  displayName: string | null;
  city: string | null;
  status: string;
  verificationTier: string;
}
interface Dashboard {
  dealersByStatus: Record<string, number>;
  vehiclesByStatus: Record<string, number>;
  totalLeads: number;
  totalUsers: number;
  totalAppointments: number;
}
interface Audit {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  createdAt: string;
}

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [phone, setPhone] = useState('+919000000001');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);

  async function load() {
    const [d, dl, a] = await Promise.all([
      api<Dashboard>('/admin/dashboard', { auth: true }),
      api<Dealer[]>('/admin/dealers', { auth: true }),
      api<Audit[]>('/admin/audit-log', { auth: true }),
    ]);
    setDash(d);
    setDealers(dl);
    setAudit(a);
  }
  useEffect(() => {
    if (authed) load().catch((e) => setError(errMsg(e)));
  }, [authed]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const sendOtp = () =>
    run(async () => {
      const r = await api<{ devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: { phone },
      });
      setSent(true);
      if (r.devCode) {
        setHint(r.devCode);
        setCode(r.devCode);
      }
    });
  const verify = () =>
    run(async () => {
      const r = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', {
        method: 'POST',
        body: { phone, code },
      });
      setTokens(r.accessToken, r.refreshToken);
      setAuthed(true);
    });

  const act = (fn: () => Promise<unknown>) =>
    run(async () => {
      await fn();
      await load();
    });

  if (authed === null) return <Shell>Loading…</Shell>;
  if (!authed)
    return (
      <Shell>
        <h1>Admin</h1>
        <p style={{ color: 'var(--muted)' }}>
          Sign in with an admin phone (seeded: +919000000001).
        </p>
        {!sent ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={input} />
            <button style={btn} disabled={busy} onClick={sendOtp}>
              Get OTP
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="OTP"
              style={input}
            />
            <button style={btn} disabled={busy} onClick={verify}>
              Verify
            </button>
          </div>
        )}
        {hint && <p style={{ color: 'var(--accent)', fontSize: 13 }}>Dev OTP: {hint}</p>}
        {error && <p style={{ color: '#f87171' }}>{error}</p>}
      </Shell>
    );

  return (
    <Shell>
      <h1>Admin console</h1>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {dash && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0 24px' }}>
          <Stat label="Users" value={dash.totalUsers} />
          <Stat label="Leads" value={dash.totalLeads} />
          <Stat label="Appointments" value={dash.totalAppointments} />
          <Stat label="Active dealers" value={dash.dealersByStatus.ACTIVE ?? 0} />
          <Stat label="Live cars" value={dash.vehiclesByStatus.LIVE ?? 0} />
        </div>
      )}

      <h2 style={{ fontSize: 18 }}>Dealers</h2>
      <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
        {dealers.map((d) => (
          <div
            key={d.id}
            style={{ background: 'var(--card)', borderRadius: 10, padding: '0.8rem 1rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{d.displayName ?? d.id.slice(0, 8)}</strong>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                {d.city ?? '—'} · {d.status} · {d.verificationTier}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                style={sm}
                disabled={busy}
                onClick={() =>
                  act(() =>
                    api(`/admin/dealers/${d.id}/tier`, {
                      method: 'POST',
                      body: { tier: 'T3', reason: 'admin certified' },
                      auth: true,
                    }),
                  )
                }
              >
                Certify (T3)
              </button>
              <button
                style={sm}
                disabled={busy}
                onClick={() =>
                  act(() =>
                    api(`/admin/dealers/${d.id}/status`, {
                      method: 'POST',
                      body: { status: 'SUSPENDED', reason: 'admin review' },
                      auth: true,
                    }),
                  )
                }
              >
                Suspend
              </button>
              <button
                style={sm}
                disabled={busy}
                onClick={() =>
                  act(() =>
                    api(`/admin/dealers/${d.id}/status`, {
                      method: 'POST',
                      body: { status: 'ACTIVE', reason: 'reinstated' },
                      auth: true,
                    }),
                  )
                }
              >
                Activate
              </button>
            </div>
          </div>
        ))}
        {dealers.length === 0 && <p style={{ color: 'var(--muted)' }}>No dealers.</p>}
      </div>

      <h2 style={{ fontSize: 18 }}>Audit log</h2>
      <div style={{ display: 'grid', gap: 6 }}>
        {audit.map((a) => (
          <div key={a.id} style={{ fontSize: 13, color: 'var(--muted)' }}>
            <span style={{ color: 'var(--fg)' }}>{a.action}</span> · {a.entityType}:
            {a.entityId?.slice(0, 8)} · {a.reason ?? ''} ·{' '}
            {new Date(a.createdAt).toLocaleString('en-IN')}
          </div>
        ))}
        {audit.length === 0 && <p style={{ color: 'var(--muted)' }}>No actions yet.</p>}
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</div>
    </div>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.5rem' }}>{children}</main>
  );
}
const input: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#0b1020',
  color: 'var(--fg)',
};
const btn: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent)',
  color: '#04201c',
  fontWeight: 600,
  cursor: 'pointer',
};
const sm: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'transparent',
  color: 'var(--fg)',
  cursor: 'pointer',
  fontSize: 13,
};
