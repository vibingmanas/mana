'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';

interface Lead {
  id: string;
  intent: string;
  status: string;
  note: string | null;
  createdAt: string;
  vehicle: { make: string | null; model: string | null; regNumber: string } | null;
  buyer: { user: { phone: string; name: string | null } } | null;
}

interface LeadsResponse {
  pipeline: Record<string, number>;
  leads: Lead[];
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'APPOINTMENT', 'WON', 'LOST'];
const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

export default function DealerLeads() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);
  const load = async () => setData(await api<LeadsResponse>('/dealer/leads', { auth: true }));
  useEffect(() => {
    if (authed) load().catch((e) => setError(errMsg(e)));
  }, [authed]);

  async function setStatus(id: string, status: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/dealer/leads/${id}`, { method: 'PATCH', body: { status }, auth: true });
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
      <h1>Leads</h1>
      {data && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 20px' }}>
          {STAGES.map((s) => (
            <span
              key={s}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: 'var(--card)',
                fontSize: 13,
              }}
            >
              {s}: <strong>{data.pipeline[s] ?? 0}</strong>
            </span>
          ))}
        </div>
      )}
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <div style={{ display: 'grid', gap: 10 }}>
        {data?.leads.map((l) => {
          const phone = l.buyer?.user.phone ?? '';
          return (
            <div
              key={l.id}
              style={{ background: 'var(--card)', borderRadius: 12, padding: '1rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>
                  {l.vehicle?.make} {l.vehicle?.model} · {l.vehicle?.regNumber}
                </strong>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>{l.intent}</span>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0' }}>
                {l.buyer?.user.name ?? 'Buyer'} · {phone} ·{' '}
                {new Date(l.createdAt).toLocaleDateString('en-IN')}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={l.status}
                  disabled={busy}
                  onChange={(e) => setStatus(l.id, e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: '#0b1020',
                    color: 'var(--fg)',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {phone && (
                  <a
                    href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13 }}
                  >
                    WhatsApp →
                  </a>
                )}
              </div>
            </div>
          );
        })}
        {data?.leads.length === 0 && <p style={{ color: 'var(--muted)' }}>No leads yet.</p>}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem' }}>{children}</main>
  );
}
