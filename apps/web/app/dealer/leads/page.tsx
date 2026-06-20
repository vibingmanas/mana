'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, display, h1 } from '../../../lib/ds';

interface Lead {
  id: string;
  intent: string;
  status: string;
  createdAt: string;
  vehicle: { make: string | null; model: string | null; regNumber: string } | null;
  buyer: { user: { name: string | null; phone: string } } | null;
}
interface LeadsResponse {
  pipeline: Record<string, number>;
  leads: Lead[];
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'APPOINTMENT', 'WON', 'LOST'];
const STAGE_LABEL: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  APPOINTMENT: 'Appointment',
  WON: 'Won',
  LOST: 'Lost',
};
const NEXT: Record<string, string> = {
  NEW: 'CONTACTED',
  CONTACTED: 'QUALIFIED',
  QUALIFIED: 'APPOINTMENT',
  APPOINTMENT: 'WON',
};
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

  async function advance(id: string, status: string) {
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

  const open =
    (data?.pipeline.NEW ?? 0) + (data?.pipeline.CONTACTED ?? 0) + (data?.pipeline.QUALIFIED ?? 0);

  return (
    <section>
      <div style={{ marginBottom: 18 }}>
        <h1 style={h1}>Leads</h1>
        <p style={{ margin: '5px 0 0', color: C.grey, fontSize: 14.5 }}>
          {open} open · advance each card through your pipeline
        </p>
      </div>
      {error && <p style={{ color: C.coralDark }}>{error}</p>}

      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          paddingBottom: 10,
          alignItems: 'flex-start',
        }}
      >
        {STAGES.map((stage) => {
          const cards = (data?.leads ?? []).filter((l) => l.status === stage);
          return (
            <div
              key={stage}
              style={{
                flex: '0 0 264px',
                background: C.cream2,
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px 12px',
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 13.5, color: C.indigo }}>
                  {STAGE_LABEL[stage]}
                </span>
                <span
                  style={{
                    background: '#fff',
                    border: `1px solid ${C.border}`,
                    color: C.grey,
                    fontWeight: 700,
                    fontSize: 12,
                    padding: '2px 9px',
                    borderRadius: 999,
                  }}
                >
                  {data?.pipeline[stage] ?? 0}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {cards.map((l) => {
                  const nm = l.buyer?.user.name ?? l.buyer?.user.phone ?? 'Buyer';
                  const phone = l.buyer?.user.phone ?? '';
                  const next = NEXT[l.status];
                  return (
                    <div
                      key={l.id}
                      style={{
                        background: '#fff',
                        border: `1px solid ${C.border}`,
                        borderRadius: 13,
                        padding: 13,
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}
                      >
                        <span
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: C.tint,
                            color: C.indigo,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 12,
                            flex: '0 0 auto',
                          }}
                        >
                          {nm.charAt(0).toUpperCase()}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: C.text,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {nm}
                        </div>
                        <span
                          style={{
                            background: C.tint,
                            color: C.indigo,
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {l.intent.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: C.grey,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {l.vehicle?.make} {l.vehicle?.model} · {l.vehicle?.regNumber}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 10,
                          gap: 8,
                        }}
                      >
                        {phone ? (
                          <a
                            href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 11.5, color: C.coral, fontWeight: 700 }}
                          >
                            WhatsApp →
                          </a>
                        ) : (
                          <span />
                        )}
                        {next && (
                          <button
                            disabled={busy}
                            onClick={() => advance(l.id, next)}
                            style={{
                              background: C.tint,
                              color: C.indigo,
                              border: 'none',
                              borderRadius: 8,
                              padding: '4px 10px',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {STAGE_LABEL[next]} →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div style={{ color: C.grey, fontSize: 12.5, padding: '4px 6px' }}>—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
