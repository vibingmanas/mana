'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, setTokens, type ApiError } from '../../lib/api';
import { C, display, h1, card, input, btnInk, btnGhost, btnPrimary } from '../../lib/ds';

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
interface Flag {
  key: string;
  enabled: boolean;
  description: string | null;
}
interface Block {
  id: string;
  kind: string;
  value: string;
  reason: string | null;
}
interface Dispute {
  id: string;
  type: string;
  message: string;
  status: string;
  vehicleId: string | null;
  dealerId: string | null;
  createdAt: string;
}
interface AdminJob {
  id: string;
  status: string;
  assignedInspectorId: string | null;
  vehicle: { regNumber: string; make: string | null; model: string | null } | null;
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
  const [flags, setFlags] = useState<Flag[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => setAuthed(!!getToken()), []);

  async function load() {
    const [d, dl, a, fl, bl, di, jb] = await Promise.all([
      api<Dashboard>('/admin/dashboard', { auth: true }),
      api<Dealer[]>('/admin/dealers', { auth: true }),
      api<Audit[]>('/admin/audit-log', { auth: true }),
      api<Flag[]>('/admin/feature-flags', { auth: true }),
      api<Block[]>('/admin/blocklist', { auth: true }),
      api<Dispute[]>('/admin/disputes?status=OPEN', { auth: true }),
      api<AdminJob[]>('/inspections/admin/jobs', { auth: true }),
    ]);
    setDash(d);
    setDealers(dl);
    setAudit(a);
    setFlags(fl);
    setBlocks(bl);
    setDisputes(di);
    setJobs(jb);
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

  const Bar = () => (
    <header
      style={{
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(255,255,255,.85)',
        backdropFilter: 'blur(14px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '12px clamp(14px,3vw,28px)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: C.indigo,
              color: C.cream,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: display,
              fontWeight: 800,
            }}
          >
            m
          </span>
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 18, color: C.indigo }}>
            mana
          </span>
        </Link>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: C.coral,
          }}
        >
          Admin
        </span>
      </div>
    </header>
  );

  if (authed === null) return <Shell>Loading…</Shell>;
  if (!authed)
    return (
      <div>
        <Bar />
        <main style={{ maxWidth: 440, margin: '0 auto', padding: '3rem 1.5rem' }}>
          <h1 style={h1}>Admin sign-in</h1>
          <p style={{ color: C.grey, margin: '6px 0 18px', fontSize: 14.5 }}>
            Seeded admin: +919000000001
          </p>
          <div style={card}>
            {!sent ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} style={input} />
                <button style={{ ...btnInk, flex: '0 0 auto' }} disabled={busy} onClick={sendOtp}>
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
                <button style={{ ...btnInk, flex: '0 0 auto' }} disabled={busy} onClick={verify}>
                  Verify
                </button>
              </div>
            )}
            {hint && (
              <p style={{ color: C.coral, fontSize: 13, margin: '8px 0 0' }}>Demo OTP: {hint}</p>
            )}
            {error && <p style={{ color: C.coralDark, marginTop: 10 }}>{error}</p>}
          </div>
        </main>
      </div>
    );

  return (
    <div>
      <Bar />
      <main
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,30px) clamp(14px,3vw,28px) 80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <h1 style={h1}>Admin console</h1>
          <button
            style={btnGhost}
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await api<{ enabled: boolean; indexed: number }>(
                  '/admin/search/reindex',
                  {
                    method: 'POST',
                    auth: true,
                  },
                );
                setNote(
                  r.enabled
                    ? `Search reindexed — ${r.indexed} listings.`
                    : 'OpenSearch not configured; using Postgres search.',
                );
              })
            }
          >
            Reindex search
          </button>
        </div>
        {error && <p style={{ color: C.coralDark }}>{error}</p>}
        {note && <p style={{ color: C.indigo, fontWeight: 600, fontSize: 14 }}>{note}</p>}
        {dash && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0 28px' }}>
            <Stat label="Users" value={dash.totalUsers} />
            <Stat label="Leads" value={dash.totalLeads} />
            <Stat label="Appointments" value={dash.totalAppointments} />
            <Stat label="Active dealers" value={dash.dealersByStatus.ACTIVE ?? 0} />
            <Stat label="Live cars" value={dash.vehiclesByStatus.LIVE ?? 0} />
          </div>
        )}

        <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, marginBottom: 12 }}>
          Dealers
        </h2>
        <div style={{ display: 'grid', gap: 8, marginBottom: 28 }}>
          {dealers.map((d) => (
            <div key={d.id} style={{ ...card, padding: '14px 16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <strong style={{ fontFamily: display, color: C.text }}>
                  {d.displayName ?? d.id.slice(0, 8)}
                </strong>
                <span style={{ color: C.grey, fontSize: 13 }}>
                  {d.city ?? '—'} · {d.status} · {d.verificationTier}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  style={btnGhost}
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
                  style={btnGhost}
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
                  style={btnGhost}
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
          {dealers.length === 0 && <p style={{ color: C.grey }}>No dealers.</p>}
        </div>

        {/* Inspection scheduling */}
        <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, marginBottom: 12 }}>
          Inspection jobs
        </h2>
        <div style={{ display: 'grid', gap: 8, marginBottom: 28 }}>
          {jobs.map((j) => (
            <div key={j.id} style={{ ...card, padding: '14px 16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <strong style={{ fontFamily: display, color: C.text }}>
                  {j.vehicle?.make} {j.vehicle?.model}{' '}
                  <span style={{ color: C.grey, fontWeight: 400 }}>· {j.vehicle?.regNumber}</span>
                </strong>
                <span style={{ color: C.grey, fontSize: 13 }}>{j.status.toLowerCase()}</span>
              </div>
              {j.status === 'REQUESTED' && (
                <AssignForm jobId={j.id} onDone={() => act(async () => {})} />
              )}
            </div>
          ))}
          {jobs.length === 0 && <p style={{ color: C.grey }}>No inspection jobs.</p>}
        </div>

        {/* Disputes */}
        <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, marginBottom: 12 }}>
          Open disputes
        </h2>
        <div style={{ display: 'grid', gap: 8, marginBottom: 28 }}>
          {disputes.map((d) => (
            <div key={d.id} style={{ ...card, padding: '14px 16px' }}>
              <div style={{ fontSize: 14, color: C.text }}>
                <strong style={{ textTransform: 'capitalize' }}>{d.type}</strong> — {d.message}
              </div>
              <div style={{ fontSize: 12, color: C.grey, margin: '4px 0 10px' }}>
                {new Date(d.createdAt).toLocaleString('en-IN')}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  style={btnGhost}
                  disabled={busy}
                  onClick={() =>
                    act(() =>
                      api(`/admin/disputes/${d.id}/resolve`, {
                        method: 'POST',
                        body: { status: 'RESOLVED', resolution: 'Resolved by admin' },
                        auth: true,
                      }),
                    )
                  }
                >
                  Resolve
                </button>
                <button
                  style={btnGhost}
                  disabled={busy}
                  onClick={() =>
                    act(() =>
                      api(`/admin/disputes/${d.id}/resolve`, {
                        method: 'POST',
                        body: { status: 'REJECTED', resolution: 'Rejected by admin' },
                        auth: true,
                      }),
                    )
                  }
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {disputes.length === 0 && <p style={{ color: C.grey }}>No open disputes.</p>}
        </div>

        {/* Feature flags */}
        <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, marginBottom: 12 }}>
          Feature flags
        </h2>
        <div style={{ ...card, display: 'grid', gap: 10, marginBottom: 28 }}>
          {flags.map((f) => (
            <div
              key={f.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div>
                <strong style={{ color: C.text }}>{f.key}</strong>
                {f.description && (
                  <span style={{ color: C.grey, fontSize: 13 }}> — {f.description}</span>
                )}
              </div>
              <button
                style={f.enabled ? btnInk : btnGhost}
                disabled={busy}
                onClick={() =>
                  act(() =>
                    api(`/admin/feature-flags/${f.key}`, {
                      method: 'PUT',
                      body: { enabled: !f.enabled },
                      auth: true,
                    }),
                  )
                }
              >
                {f.enabled ? 'On' : 'Off'}
              </button>
            </div>
          ))}
          {flags.length === 0 && <p style={{ color: C.grey, margin: 0 }}>No flags yet.</p>}
        </div>

        {/* Fraud blocklist */}
        <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, marginBottom: 12 }}>
          Fraud blocklist
        </h2>
        <div style={{ ...card, marginBottom: 28 }}>
          <BlockForm onDone={() => act(async () => {})} />
          <div style={{ display: 'grid', gap: 6, marginTop: 14 }}>
            {blocks.map((b) => (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13.5,
                }}
              >
                <span style={{ color: C.text }}>
                  <strong>{b.kind}</strong> {b.value}
                  {b.reason ? <span style={{ color: C.grey }}> · {b.reason}</span> : null}
                </span>
                <button
                  style={{ ...btnGhost, padding: '6px 12px' }}
                  disabled={busy}
                  onClick={() =>
                    act(() => api(`/admin/blocklist/${b.id}`, { method: 'DELETE', auth: true }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            {blocks.length === 0 && <p style={{ color: C.grey, margin: 0 }}>Nothing blocked.</p>}
          </div>
        </div>

        <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, marginBottom: 12 }}>
          Audit log
        </h2>
        <div style={{ ...card, display: 'grid', gap: 6 }}>
          {audit.map((a) => (
            <div key={a.id} style={{ fontSize: 13, color: C.grey }}>
              <span style={{ color: C.indigo, fontWeight: 700 }}>{a.action}</span> · {a.entityType}:
              {a.entityId?.slice(0, 8)} · {a.reason ?? ''} ·{' '}
              {new Date(a.createdAt).toLocaleString('en-IN')}
            </div>
          ))}
          {audit.length === 0 && <p style={{ color: C.grey, margin: 0 }}>No actions yet.</p>}
        </div>
      </main>
    </div>
  );
}

function AssignForm({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const [inspectorId, setInspectorId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assign = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/inspections/jobs/${jobId}/assign`, {
        method: 'POST',
        body: { inspectorId },
        auth: true,
      });
      onDone();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      <input
        value={inspectorId}
        onChange={(e) => setInspectorId(e.target.value)}
        placeholder="Inspector user id"
        style={{ ...input, flex: '1 1 200px' }}
      />
      <button style={btnInk} disabled={busy || !inspectorId} onClick={assign}>
        Assign
      </button>
      {error && <span style={{ color: C.coralDark, fontSize: 13 }}>{error}</span>}
    </div>
  );
}

function BlockForm({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState('phone');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/admin/blocklist', {
        method: 'POST',
        body: { kind, value, reason: reason || undefined },
        auth: true,
      });
      setValue('');
      setReason('');
      onDone();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        style={{ ...input, flex: '0 0 130px' }}
      >
        <option value="phone">phone</option>
        <option value="pan">pan</option>
        <option value="gstin">gstin</option>
        <option value="reg_number">reg_number</option>
      </select>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value"
        style={{ ...input, flex: '1 1 160px' }}
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        style={{ ...input, flex: '1 1 160px' }}
      />
      <button style={btnPrimary} disabled={busy || !value} onClick={add}>
        Block
      </button>
      {error && <span style={{ color: C.coralDark, fontSize: 13 }}>{error}</span>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ ...card, minWidth: 120, padding: '16px 20px' }}>
      <div style={{ fontFamily: display, fontSize: 26, fontWeight: 800, color: C.indigo }}>
        {value}
      </div>
      <div style={{ color: C.grey, fontSize: 13 }}>{label}</div>
    </div>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem' }}>{children}</main>
  );
}
