'use client';

import { useEffect, useState } from 'react';
import { api, getToken, setTokens, type ApiError } from '../../../lib/api';

function errMsg(e: unknown): string {
  return (e as ApiError)?.message ?? 'Something went wrong';
}

export default function BuyerActions({ vehicleId }: { vehicleId: string }) {
  const [authed, setAuthed] = useState(false);
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(!!getToken());
  }, []);

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

  const lead = (intent: string, label: string) =>
    run(async () => {
      await api('/buyer/leads', { method: 'POST', body: { vehicleId, intent }, auth: true });
      setMsg(`${label} sent — the dealer will reach out.`);
    });

  const save = () =>
    run(async () => {
      await api('/buyer/wishlist', { method: 'POST', body: { vehicleId }, auth: true });
      setMsg('Saved to your wishlist.');
    });

  return (
    <section
      style={{ background: 'var(--card)', borderRadius: 12, padding: '1.25rem', marginTop: 16 }}
    >
      <strong>Interested?</strong>
      {!authed ? (
        <div style={{ marginTop: 12 }}>
          {!otpSent ? (
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
              <button style={btn} disabled={busy} onClick={verifyOtp}>
                Verify
              </button>
            </div>
          )}
          {devHint && <p style={{ color: 'var(--accent)', fontSize: 13 }}>Dev OTP: {devHint}</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button
            style={btn}
            disabled={busy}
            onClick={() => lead('TEST_DRIVE', 'Test drive request')}
          >
            Book test drive
          </button>
          <button style={ghost} disabled={busy} onClick={() => lead('ENQUIRY', 'Enquiry')}>
            Enquire
          </button>
          <button style={ghost} disabled={busy} onClick={() => lead('FINANCE', 'Finance enquiry')}>
            Check finance
          </button>
          <button style={ghost} disabled={busy} onClick={save}>
            ♥ Save
          </button>
        </div>
      )}
      {msg && <p style={{ color: 'var(--accent)', marginTop: 12 }}>{msg}</p>}
      {error && <p style={{ color: '#f87171', marginTop: 12 }}>{error}</p>}
    </section>
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
const ghost: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'transparent',
  color: 'var(--fg)',
  cursor: 'pointer',
};
