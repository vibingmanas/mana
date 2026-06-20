'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';

interface Vehicle {
  id: string;
  regNumber: string;
  make: string | null;
  model: string | null;
  price: number | null;
  status: string;
  verification: { verifiedAt: string | null; hypothecationActive: boolean | null } | null;
  media: { id: string; url: string }[];
}

function errMsg(e: unknown): string {
  return (e as ApiError)?.message ?? 'Something went wrong';
}

export default function DealerCars() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [cars, setCars] = useState<Vehicle[]>([]);
  const [reg, setReg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(!!getToken());
  }, []);

  async function load() {
    setCars(await api<Vehicle[]>('/vehicles', { auth: true }));
  }

  useEffect(() => {
    if (authed) load().catch((e) => setError(errMsg(e)));
  }, [authed]);

  async function run(fn: () => Promise<void>) {
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
      <h1>My inventory</h1>
      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input
          value={reg}
          onChange={(e) => setReg(e.target.value.toUpperCase())}
          placeholder="Registration e.g. MH12AB1234"
          style={inputStyle}
        />
        <button
          style={btnStyle}
          disabled={busy || !reg}
          onClick={() =>
            run(async () => {
              await api('/vehicles', { method: 'POST', body: { regNumber: reg }, auth: true });
              setReg('');
            })
          }
        >
          Add car
        </button>
      </div>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}

      <div style={{ display: 'grid', gap: 12 }}>
        {cars.map((c) => (
          <CarRow key={c.id} car={c} busy={busy} run={run} />
        ))}
        {cars.length === 0 && <p style={{ color: 'var(--muted)' }}>No cars yet. Add one above.</p>}
      </div>
    </Shell>
  );
}

function CarRow({
  car,
  busy,
  run,
}: {
  car: Vehicle;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [price, setPrice] = useState(car.price?.toString() ?? '');
  const [photo, setPhoto] = useState('');

  return (
    <div style={{ background: 'var(--card)', borderRadius: 12, padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <strong>
          {car.regNumber} {car.make ? `· ${car.make} ${car.model ?? ''}` : ''}
        </strong>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{car.status}</span>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0' }}>
        {car.verification?.verifiedAt ? '✓ RC verified' : 'RC not verified'} · {car.media.length}{' '}
        photo(s)
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button
          style={smBtn}
          disabled={busy}
          onClick={() =>
            run(() => api(`/vehicles/${car.id}/verify-rc`, { method: 'POST', auth: true }))
          }
        >
          Verify RC
        </button>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price ₹"
          style={{ ...inputStyle, width: 110 }}
        />
        <button
          style={smBtn}
          disabled={busy}
          onClick={() =>
            run(() =>
              api(`/vehicles/${car.id}`, {
                method: 'PATCH',
                body: { price: Number(price) },
                auth: true,
              }),
            )
          }
        >
          Save price
        </button>
        <input
          value={photo}
          onChange={(e) => setPhoto(e.target.value)}
          placeholder="Photo URL"
          style={{ ...inputStyle, width: 160 }}
        />
        <button
          style={smBtn}
          disabled={busy || !photo}
          onClick={() =>
            run(async () => {
              await api(`/vehicles/${car.id}/media`, {
                method: 'POST',
                body: { type: 'PHOTO', url: photo },
                auth: true,
              });
              setPhoto('');
            })
          }
        >
          Add photo
        </button>
        <button
          style={{ ...smBtn, background: 'var(--accent)', color: '#04201c' }}
          disabled={busy}
          onClick={() =>
            run(() => api(`/vehicles/${car.id}/publish`, { method: 'POST', auth: true }))
          }
        >
          Publish
        </button>
        {car.status === 'LIVE' && (
          <button
            style={smBtn}
            disabled={busy}
            onClick={() =>
              run(() =>
                api(`/vehicles/${car.id}/status`, {
                  method: 'POST',
                  body: { status: 'SOLD' },
                  auth: true,
                }),
              )
            }
          >
            Mark sold
          </button>
        )}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.5rem' }}>{children}</main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#0b1020',
  color: 'var(--fg)',
};
const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent)',
  color: '#04201c',
  fontWeight: 600,
  cursor: 'pointer',
};
const smBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'transparent',
  color: 'var(--fg)',
  cursor: 'pointer',
  fontSize: 13,
};
