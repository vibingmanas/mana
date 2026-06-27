'use client';
import Link from 'next/link';
import { useState } from 'react';
import SiteHeader from '../components/site-header';
import { api, getToken, setTokens, type ApiError } from '../../lib/api';
import { C, display, h1, card, input, btnPrimary, btnInk, btnGhost, inr } from '../../lib/ds';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

interface Offer {
  id: string;
  dealerName: string;
  dealerTier: string;
  amount: number;
  status: string;
}
interface SellReq {
  id: string;
  estLow: number;
  estFair: number;
  estHigh: number;
  status: string;
  offers: Offer[];
}

export default function SellPage() {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // auth
  const [authed, setAuthed] = useState(() =>
    typeof window !== 'undefined' ? !!getToken() : false,
  );
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);

  // form
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [km, setKm] = useState('');
  const [owners, setOwners] = useState('1');
  const [city, setCity] = useState('');
  const [condition, setCondition] = useState('good');
  const [accident, setAccident] = useState(false);

  const [req, setReq] = useState<SellReq | null>(null);

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
      setOtpSent(true);
      if (r.devCode) {
        setDevHint(r.devCode);
        setCode(r.devCode);
      }
    });
  const verifyOtp = () =>
    run(async () => {
      const r = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', {
        method: 'POST',
        body: { phone, code, role: 'BUYER' },
      });
      setTokens(r.accessToken, r.refreshToken);
      setAuthed(true);
    });

  const estimate = () =>
    run(async () => {
      const r = await api<SellReq>('/sell/estimate', {
        method: 'POST',
        body: {
          make,
          model,
          manufactureYear: Number(year),
          odometerKm: Number(km),
          ownersCount: Number(owners),
          city,
          condition,
          accidentDamage: accident,
        },
        auth: true,
      });
      setReq(r);
      setStep(3);
    });
  const book = () =>
    run(async () => {
      const r = await api<SellReq>(`/sell/${req!.id}/book-inspection`, {
        method: 'POST',
        body: {},
        auth: true,
      });
      setReq(r);
    });
  const accept = (offerId: string) =>
    run(async () => {
      const r = await api<SellReq>(`/sell/${req!.id}/offers/${offerId}/accept`, {
        method: 'POST',
        auth: true,
      });
      setReq(r);
    });

  const Progress = () => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
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
  );
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div style={{ overflowX: 'hidden' }}>
      <SiteHeader />
      <main
        style={{
          maxWidth: 600,
          margin: '0 auto',
          padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,40px) 80px',
        }}
      >
        {children}
      </main>
    </div>
  );

  if (!authed) {
    return (
      <Shell>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: C.coral,
            marginBottom: 12,
          }}
        >
          Sell your car
        </div>
        <h1 style={h1}>Get your car&apos;s price in 2 minutes</h1>
        <p style={{ color: C.grey, margin: '6px 0 18px', fontSize: 15 }}>
          Free, no obligation. Sign in to start.{' '}
          <Link href="/sell/offers" style={{ color: C.coral, fontWeight: 600 }}>
            View your offers →
          </Link>
        </p>
        <div style={card}>
          {!otpSent ? (
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
              <button style={{ ...btnInk, flex: '0 0 auto' }} disabled={busy} onClick={verifyOtp}>
                Verify
              </button>
            </div>
          )}
          {devHint && (
            <p style={{ color: C.coral, fontSize: 13, margin: '8px 0 0' }}>Demo OTP: {devHint}</p>
          )}
          {error && <p style={{ color: C.coralDark, marginTop: 10 }}>{error}</p>}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          color: C.coral,
          marginBottom: 12,
        }}
      >
        Sell your car · Step {Math.min(step, 3)} of 3
      </div>
      <Progress />

      {step === 1 && (
        <div>
          <h1 style={{ ...h1, fontSize: 26 }}>Which car are you selling?</h1>
          <p style={{ color: C.grey, margin: '6px 0 18px', fontSize: 14.5 }}>
            Tell us the basics — we&apos;ll value it instantly.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="Make (e.g. Maruti)"
              style={input}
            />
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model (e.g. Swift)"
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
          <button
            style={{ ...btnInk, width: '100%', marginTop: 18, padding: 15, fontSize: 16 }}
            disabled={busy || !make || !model || !year || !km}
            onClick={() => setStep(2)}
          >
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 style={{ ...h1, fontSize: 26 }}>Condition &amp; details</h1>
          <p style={{ color: C.grey, margin: '6px 0 18px', fontSize: 14.5 }}>
            A few taps — no jargon.
          </p>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}
          >
            <input
              value={owners}
              onChange={(e) => setOwners(e.target.value)}
              placeholder="Owners"
              style={input}
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              style={input}
            />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            Overall condition
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['excellent', 'good', 'fair'].map((c) => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 12,
                  border: `1.5px solid ${condition === c ? C.indigo : C.border}`,
                  background: condition === c ? C.indigo : '#fff',
                  color: condition === c ? C.cream : C.indigo,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              color: C.text,
              marginBottom: 18,
            }}
          >
            <input
              type="checkbox"
              checked={accident}
              onChange={(e) => setAccident(e.target.checked)}
            />{' '}
            Has had a major accident / damage
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...btnGhost, padding: '15px 20px' }} onClick={() => setStep(1)}>
              Back
            </button>
            <button
              style={{ ...btnInk, flex: 1, padding: 15, fontSize: 16 }}
              disabled={busy}
              onClick={estimate}
            >
              {busy ? 'Valuing…' : 'Get my estimate →'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && req && (
        <div>
          <h1 style={{ ...h1, fontSize: 26 }}>Your estimated price</h1>
          <p style={{ color: C.grey, margin: '6px 0 18px', fontSize: 14.5 }}>
            Based on recent sales of similar cars.
          </p>
          <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }}>
            <div
              style={{
                fontFamily: display,
                fontSize: 34,
                fontWeight: 800,
                color: C.indigo,
                letterSpacing: '-.02em',
              }}
            >
              {inr(req.estLow)} – {inr(req.estHigh)}
            </div>
            <div style={{ color: C.grey, fontSize: 13.5, marginTop: 6 }}>
              Fair value ~{inr(req.estFair)}
            </div>
          </div>

          {req.status === 'ESTIMATED' && (
            <div style={{ ...card, marginTop: 16 }}>
              <strong style={{ fontFamily: display, color: C.indigo }}>
                Free doorstep inspection
              </strong>
              <p style={{ color: C.grey, fontSize: 14, margin: '6px 0 14px' }}>
                Book a free inspection — then verified dealers compete with real offers. No
                obligation, paperwork handled.
              </p>
              <button
                style={{ ...btnPrimary, width: '100%', padding: 15, fontSize: 16 }}
                disabled={busy}
                onClick={book}
              >
                {busy ? 'Booking…' : 'Book free inspection'}
              </button>
            </div>
          )}

          {req.offers.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <strong style={{ fontFamily: display, color: C.indigo, fontSize: 18 }}>
                {req.status === 'ACCEPTED'
                  ? 'Offer accepted'
                  : `${req.offers.length} competitive offers`}
              </strong>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {req.offers.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      ...card,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      opacity: o.status === 'DECLINED' ? 0.5 : 1,
                      border:
                        o.status === 'ACCEPTED' ? `2px solid ${C.indigo}` : `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: display, fontWeight: 800, color: C.text }}>
                        {o.dealerName}
                      </div>
                      <div style={{ fontSize: 12.5, color: C.grey }}>
                        Tier {o.dealerTier} · verified dealer
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: display,
                        fontWeight: 800,
                        fontSize: 20,
                        color: C.indigo,
                      }}
                    >
                      {inr(o.amount)}
                    </div>
                    {req.status !== 'ACCEPTED' ? (
                      <button style={btnInk} disabled={busy} onClick={() => accept(o.id)}>
                        Accept
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: o.status === 'ACCEPTED' ? C.indigo : C.grey,
                          background: o.status === 'ACCEPTED' ? C.tint : C.cream2,
                          padding: '5px 11px',
                          borderRadius: 999,
                        }}
                      >
                        {o.status.toLowerCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {req.status === 'ACCEPTED' && (
                <p style={{ color: C.indigo, fontWeight: 600, marginTop: 14 }}>
                  Done — we&apos;ll handle payment + free RC transfer.
                </p>
              )}
            </div>
          )}
          {error && <p style={{ color: C.coralDark, marginTop: 14 }}>{error}</p>}
        </div>
      )}
    </Shell>
  );
}
