'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, display, h1, card, input, btnPrimary, btnGhost } from '../../../lib/ds';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

interface Channel {
  channel: string;
  enabled: boolean;
}
interface BulkResult {
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

const SAMPLE_CSV =
  'regNumber,make,model,manufactureYear,odometerKm,price\nMH12XY0001,Maruti,Baleno,2021,30000,650000';

export default function DealerTools() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);
  const loadChannels = async () =>
    setChannels(await api<Channel[]>('/dealer/syndication', { auth: true }));
  useEffect(() => {
    if (authed) loadChannels().catch((e) => setError(errMsg(e)));
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

  const feedUrl = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/dealer/syndication/feed`;

  return (
    <section>
      <h1 style={h1}>Tools</h1>
      <p style={{ margin: '5px 0 18px', color: C.grey, fontSize: 14.5 }}>
        Bulk-upload inventory and syndicate live listings to marketplaces.
      </p>
      {error && <p style={{ color: C.coralDark }}>{error}</p>}

      {/* Bulk upload */}
      <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, margin: '8px 0 10px' }}>
        Bulk upload (CSV)
      </h2>
      <div style={{ ...card, marginBottom: 26 }}>
        <p style={{ margin: '0 0 10px', color: C.grey, fontSize: 13.5 }}>
          Header row then one car per line. Columns: regNumber, make, model, manufactureYear,
          odometerKm, price. Cars are created as drafts.
        </p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={SAMPLE_CSV}
          rows={6}
          style={{ ...input, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            style={btnPrimary}
            disabled={busy || !csv.trim()}
            onClick={() =>
              run(async () => {
                const r = await api<BulkResult>('/dealer/inventory/bulk-csv', {
                  method: 'POST',
                  body: { csv },
                  auth: true,
                });
                setResult(r);
              })
            }
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
          <button style={btnGhost} disabled={busy} onClick={() => setCsv(SAMPLE_CSV)}>
            Insert sample
          </button>
        </div>
        {result && (
          <p style={{ color: C.indigo, fontWeight: 600, fontSize: 14, marginTop: 12 }}>
            Created {result.created} · skipped {result.skipped}
            {result.errors.length > 0 && (
              <span style={{ color: C.grey, fontWeight: 400 }}>
                {' '}
                ({result.errors.map((e) => `row ${e.row}: ${e.reason}`).join('; ')})
              </span>
            )}
          </p>
        )}
      </div>

      {/* Syndication */}
      <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, margin: '8px 0 10px' }}>
        Syndication
      </h2>
      <div style={{ ...card }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {channels.map((c) => (
            <div
              key={c.channel}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <strong style={{ color: C.text }}>{c.channel}</strong>
              <button
                style={c.enabled ? btnPrimary : btnGhost}
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api(`/dealer/syndication/${c.channel}`, {
                      method: 'PUT',
                      body: { enabled: !c.enabled },
                      auth: true,
                    });
                    await loadChannels();
                  })
                }
              >
                {c.enabled ? 'On' : 'Off'}
              </button>
            </div>
          ))}
          {channels.length === 0 && <p style={{ color: C.grey, margin: 0 }}>Loading channels…</p>}
        </div>
        <p style={{ color: C.grey, fontSize: 13, marginTop: 14 }}>
          Live-listings feed (JSON):{' '}
          <a href={feedUrl} target="_blank" rel="noreferrer" style={{ color: C.coral }}>
            {feedUrl}
          </a>
        </p>
      </div>
    </section>
  );
}
