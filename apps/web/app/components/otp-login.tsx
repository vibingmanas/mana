'use client';

import { useState } from 'react';
import { api, setTokens, type ApiError } from '../../lib/api';
import { C, display, btnPrimary, input } from '../../lib/ds';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

/**
 * Reusable phone + OTP sign-in card. For seeded privileged users (admin,
 * inspector) the server keeps their existing role regardless of `role`.
 */
export default function OtpLogin({
  title = 'Sign in',
  subtitle,
  role,
  defaultPhone = '+91',
  onAuthed,
}: {
  title?: string;
  subtitle?: string;
  role?: 'BUYER' | 'DEALER_OWNER';
  defaultPhone?: string;
  onAuthed: () => void;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const send = () =>
    run(async () => {
      const r = await api<{ devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: { phone },
      });
      setSent(true);
      if (r.devCode) {
        setDevHint(r.devCode);
        setCode(r.devCode);
      }
    });

  const verify = () =>
    run(async () => {
      const r = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', {
        method: 'POST',
        body: { phone, code, ...(role ? { role } : {}) },
      });
      setTokens(r.accessToken, r.refreshToken);
      onAuthed();
    });

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '8vh auto 0',
        background: '#fff',
        border: `1px solid ${C.border}`,
        borderRadius: 22,
        padding: 28,
        boxShadow: '0 16px 50px rgba(31,39,71,.09)',
      }}
    >
      <h1
        style={{ fontFamily: display, margin: 0, fontSize: 26, fontWeight: 800, color: C.indigo }}
      >
        {title}
      </h1>
      {subtitle && (
        <p style={{ margin: '8px 0 18px', color: C.grey, fontSize: 14.5 }}>{subtitle}</p>
      )}
      {!sent ? (
        <div style={{ display: 'flex', gap: 8, marginTop: subtitle ? 0 : 18 }}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={input} />
          <button style={{ ...btnPrimary, flex: '0 0 auto' }} disabled={busy} onClick={send}>
            Get OTP
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: subtitle ? 0 : 18 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="OTP"
            style={input}
          />
          <button style={{ ...btnPrimary, flex: '0 0 auto' }} disabled={busy} onClick={verify}>
            Verify
          </button>
        </div>
      )}
      {devHint && (
        <p style={{ color: C.coral, fontSize: 13, margin: '10px 0 0' }}>Demo OTP: {devHint}</p>
      )}
      {error && <p style={{ color: C.coralDark, fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  );
}
