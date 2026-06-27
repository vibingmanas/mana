'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, display, h1, card, inr } from '../../../lib/ds';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

interface Intel {
  stockCount: number;
  pricing: { overpriced: number; underpriced: number; fair: number };
  demand: { model: string; leadCount: number }[];
  envelope: {
    model: string;
    min: number | null;
    avg: number | null;
    max: number | null;
    count: number;
    yourPrice: number | null;
  }[];
}

export default function DealerIntelligence() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [intel, setIntel] = useState<Intel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setAuthed(!!getToken()), []);
  useEffect(() => {
    if (authed)
      api<Intel>('/dealer/intelligence', { auth: true })
        .then(setIntel)
        .catch((e) => setError(errMsg(e)));
  }, [authed]);

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

  return (
    <section>
      <h1 style={h1}>Market intelligence</h1>
      <p style={{ margin: '5px 0 18px', color: C.grey, fontSize: 14.5 }}>
        How your prices sit vs the market, what buyers are asking for, and the competitor price
        band.
      </p>
      {error && <p style={{ color: C.coralDark }}>{error}</p>}
      {!intel ? (
        <p style={{ color: C.grey }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
            <Stat label="Live stock" value={`${intel.stockCount}`} />
            <Stat label="Fairly priced" value={`${intel.pricing.fair}`} color="#3B6B45" />
            <Stat label="Above market" value={`${intel.pricing.overpriced}`} color={C.coralDark} />
            <Stat label="Underpriced" value={`${intel.pricing.underpriced}`} color="#9A6B00" />
          </div>

          <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, marginBottom: 12 }}>
            Demand — leads by model
          </h2>
          <div style={{ ...card, marginBottom: 24 }}>
            {intel.demand.length === 0 ? (
              <p style={{ color: C.grey, margin: 0 }}>No leads yet.</p>
            ) : (
              intel.demand.map((d) => {
                const max = Math.max(...intel.demand.map((x) => x.leadCount));
                return (
                  <div key={d.model} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13.5,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: C.text, fontWeight: 600 }}>{d.model}</span>
                      <span style={{ color: C.grey }}>{d.leadCount} leads</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        background: C.border,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(d.leadCount / max) * 100}%`,
                          background: C.indigo,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, marginBottom: 12 }}>
            Competitor price envelope
          </h2>
          <div style={{ ...card, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: C.grey, fontSize: 12.5 }}>
                  <th style={{ padding: '6px 8px' }}>Model</th>
                  <th style={{ padding: '6px 8px' }}>Market low</th>
                  <th style={{ padding: '6px 8px' }}>Market avg</th>
                  <th style={{ padding: '6px 8px' }}>Market high</th>
                  <th style={{ padding: '6px 8px' }}>Your price</th>
                </tr>
              </thead>
              <tbody>
                {intel.envelope.map((e) => (
                  <tr key={e.model} style={{ borderTop: `1px solid ${C.border}`, fontSize: 14 }}>
                    <td style={{ padding: '9px 8px', fontWeight: 700, color: C.text }}>
                      {e.model} <span style={{ color: C.grey, fontWeight: 400 }}>({e.count})</span>
                    </td>
                    <td style={{ padding: '9px 8px', color: C.grey }}>{inr(e.min)}</td>
                    <td style={{ padding: '9px 8px', color: C.indigo, fontWeight: 700 }}>
                      {inr(e.avg)}
                    </td>
                    <td style={{ padding: '9px 8px', color: C.grey }}>{inr(e.max)}</td>
                    <td
                      style={{
                        padding: '9px 8px',
                        fontWeight: 700,
                        color:
                          e.yourPrice && e.avg
                            ? e.yourPrice > e.avg * 1.1
                              ? C.coralDark
                              : '#3B6B45'
                            : C.text,
                      }}
                    >
                      {inr(e.yourPrice)}
                    </td>
                  </tr>
                ))}
                {intel.envelope.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '12px 8px', color: C.grey }}>
                      Add stock to see benchmarks.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, minWidth: 130, padding: '16px 20px' }}>
      <div style={{ fontFamily: display, fontSize: 26, fontWeight: 800, color: color ?? C.indigo }}>
        {value}
      </div>
      <div style={{ color: C.grey, fontSize: 13 }}>{label}</div>
    </div>
  );
}
