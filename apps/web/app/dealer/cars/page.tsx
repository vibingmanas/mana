'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, display, h1, card, btnPrimary, btnInk, btnGhost, input, inr } from '../../../lib/ds';

interface Vehicle {
  id: string;
  regNumber: string;
  make: string | null;
  model: string | null;
  price: number | null;
  status: string;
  verification: { verifiedAt: string | null } | null;
  media: { id: string; url: string }[];
}
const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  LIVE: { background: C.tint, color: C.indigo },
  SOLD: { background: '#E9F0E9', color: '#3B6B45' },
  DRAFT: { background: C.cream2, color: C.grey },
  RC_VERIFIED: { background: C.cream2, color: C.grey },
};

export default function DealerCars() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [cars, setCars] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);
  const load = async () => setCars(await api<Vehicle[]>('/vehicles', { auth: true }));
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

  const live = cars.filter((c) => c.status === 'LIVE').length;

  return (
    <section>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={h1}>Inventory</h1>
          <p style={{ margin: '5px 0 0', color: C.grey, fontSize: 14.5 }}>
            {live} live · {cars.length} total listings
          </p>
        </div>
        <button style={btnPrimary} onClick={() => setAddOpen(true)}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add a car
        </button>
      </div>

      {error && <p style={{ color: C.coralDark }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cars.map((c) => (
          <div
            key={c.id}
            style={{
              ...card,
              padding: 14,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 96,
                height: 72,
                borderRadius: 13,
                overflow: 'hidden',
                background: C.tint,
                flex: '0 0 auto',
              }}
            >
              {c.media[0] && (
                <img
                  src={c.media[0].url}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            <div style={{ flex: '1 1 180px', minWidth: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: display, fontWeight: 800, fontSize: 16, color: C.text }}>
                  {c.make ? `${c.make} ${c.model ?? ''}` : c.regNumber}
                </span>
                <span
                  style={{
                    ...(STATUS_STYLE[c.status] ?? STATUS_STYLE.DRAFT),
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                  }}
                >
                  {c.status.replace('_', ' ').toLowerCase()}
                </span>
              </div>
              <div style={{ fontSize: 13, color: C.grey, marginTop: 4 }}>
                {c.regNumber} · {c.verification?.verifiedAt ? 'RC verified' : 'RC not verified'} ·{' '}
                {c.media.length} photo(s)
              </div>
            </div>
            <div style={{ minWidth: 90 }}>
              <div style={{ fontSize: 11.5, color: C.grey, fontWeight: 600 }}>Price</div>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 16, color: C.indigo }}>
                {inr(c.price)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {!c.verification?.verifiedAt && (
                <button
                  style={btnGhost}
                  disabled={busy}
                  onClick={() =>
                    run(() => api(`/vehicles/${c.id}/verify-rc`, { method: 'POST', auth: true }))
                  }
                >
                  Verify RC
                </button>
              )}
              {c.status !== 'LIVE' && c.status !== 'SOLD' && (
                <button
                  style={btnInk}
                  disabled={busy}
                  onClick={() =>
                    run(() => api(`/vehicles/${c.id}/publish`, { method: 'POST', auth: true }))
                  }
                >
                  Publish
                </button>
              )}
              {c.status === 'LIVE' && (
                <>
                  <Link
                    href={`/listings/${c.id}`}
                    target="_blank"
                    style={{ ...btnGhost, textDecoration: 'none' }}
                  >
                    View
                  </Link>
                  <button
                    style={btnGhost}
                    disabled={busy}
                    onClick={() =>
                      run(() => api(`/dealer/cars/${c.id}/boost`, { method: 'POST', auth: true }))
                    }
                  >
                    Boost
                  </button>
                  <button
                    style={btnGhost}
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        api(`/vehicles/${c.id}/status`, {
                          method: 'POST',
                          body: { status: 'SOLD' },
                          auth: true,
                        }),
                      )
                    }
                  >
                    Mark sold
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {cars.length === 0 && <p style={{ color: C.grey }}>No cars yet. Add your first above.</p>}
      </div>

      {addOpen && (
        <AddCarModal
          onClose={() => setAddOpen(false)}
          onDone={() => {
            setAddOpen(false);
            load();
          }}
        />
      )}
    </section>
  );
}

function AddCarModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [reg, setReg] = useState('');
  const [vid, setVid] = useState<string | null>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [km, setKm] = useState('');
  const [price, setPrice] = useState('');
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(fn: () => Promise<void>) {
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

  const step1 = () =>
    go(async () => {
      const v = await api<{ id: string }>('/vehicles', {
        method: 'POST',
        body: { regNumber: reg },
        auth: true,
      });
      setVid(v.id);
      await api(`/vehicles/${v.id}/verify-rc`, { method: 'POST', auth: true });
      setStep(2);
    });

  const step2 = () =>
    go(async () => {
      await api(`/vehicles/${vid}`, {
        method: 'PATCH',
        body: {
          make,
          model,
          manufactureYear: Number(year),
          odometerKm: Number(km),
          price: Number(price),
        },
        auth: true,
      });
      setStep(3);
    });

  const publish = () =>
    go(async () => {
      if (photo)
        await api(`/vehicles/${vid}/media`, {
          method: 'POST',
          body: { type: 'PHOTO', url: photo },
          auth: true,
        });
      await api(`/vehicles/${vid}/odometer-check`, { method: 'POST', auth: true }).catch(() => {});
      await api(`/vehicles/${vid}/inspect`, {
        method: 'POST',
        body: { type: 'AI_PHOTO' },
        auth: true,
      }).catch(() => {});
      await api(`/vehicles/${vid}/publish`, { method: 'POST', auth: true });
      onDone();
    });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(28,27,25,.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.cream,
          width: '100%',
          maxWidth: 520,
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 24,
          padding: 'clamp(20px,3vw,28px)',
          boxShadow: '0 20px 60px rgba(31,39,71,.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: C.coral,
            }}
          >
            Add a car · Step {step} of 3
          </span>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              border: `1px solid ${C.border}`,
              background: '#fff',
              cursor: 'pointer',
              color: C.grey,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 999,
                background: n <= step ? C.indigo : C.border,
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2
              style={{
                fontFamily: display,
                margin: '0 0 6px',
                fontSize: 24,
                fontWeight: 800,
                color: C.indigo,
              }}
            >
              Pull up the car
            </h2>
            <p style={{ margin: '0 0 18px', color: C.grey, fontSize: 14.5 }}>
              Enter the registration number — we verify the RC against VAHAN.
            </p>
            <input
              value={reg}
              onChange={(e) => setReg(e.target.value.toUpperCase())}
              placeholder="MH 12 AB 1234"
              style={{ ...input, fontSize: 18, letterSpacing: '.06em', textTransform: 'uppercase' }}
            />
            <button
              onClick={step1}
              disabled={busy || !reg}
              style={{ ...btnInk, width: '100%', marginTop: 18, padding: 15, fontSize: 16 }}
            >
              {busy ? 'Verifying…' : 'Find & verify RC →'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2
              style={{
                fontFamily: display,
                margin: '0 0 6px',
                fontSize: 24,
                fontWeight: 800,
                color: C.indigo,
              }}
            >
              Confirm & price it
            </h2>
            <p style={{ margin: '0 0 16px', color: C.grey, fontSize: 14.5 }}>
              RC verified. Add the details and a fair price.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="Make"
                style={input}
              />
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Model"
                style={input}
              />
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Year"
                style={input}
              />
              <input
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="Km driven"
                style={input}
              />
            </div>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Asking price ₹"
              style={{ ...input, marginTop: 10 }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setStep(1)} style={{ ...btnGhost, padding: '15px 20px' }}>
                Back
              </button>
              <button
                onClick={step2}
                disabled={busy || !price}
                style={{ ...btnInk, flex: 1, padding: 15, fontSize: 16 }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2
              style={{
                fontFamily: display,
                margin: '0 0 6px',
                fontSize: 24,
                fontWeight: 800,
                color: C.indigo,
              }}
            >
              Photo & publish
            </h2>
            <p style={{ margin: '0 0 16px', color: C.grey, fontSize: 14.5 }}>
              Add a photo URL. We run an odometer check + AI inspection, then publish.
            </p>
            <input
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="https://…/car.jpg"
              style={input}
            />
            <button
              onClick={publish}
              disabled={busy}
              style={{ ...btnPrimary, width: '100%', marginTop: 18, padding: 15, fontSize: 16 }}
            >
              {busy ? 'Publishing…' : 'Publish listing'}
            </button>
          </div>
        )}

        {error && <p style={{ color: C.coralDark, marginTop: 14 }}>{error}</p>}
      </div>
    </div>
  );
}
