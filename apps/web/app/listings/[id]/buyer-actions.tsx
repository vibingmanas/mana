'use client';

import { useEffect, useState } from 'react';
import { api, getToken, setTokens, type ApiError } from '../../../lib/api';
import { C, btnPrimary, btnGhost, input } from '../../../lib/ds';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

export default function BuyerActions({ vehicleId }: { vehicleId: string }) {
  const [authed, setAuthed] = useState(false);
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);

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

  if (!authed) {
    return (
      <div>
        {!otpSent ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ ...input, padding: '12px 14px' }}
            />
            <button style={{ ...btnPrimary, flex: '0 0 auto' }} disabled={busy} onClick={sendOtp}>
              Get OTP
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="OTP"
              style={{ ...input, padding: '12px 14px' }}
            />
            <button style={{ ...btnPrimary, flex: '0 0 auto' }} disabled={busy} onClick={verifyOtp}>
              Verify
            </button>
          </div>
        )}
        {devHint && (
          <p style={{ color: C.coral, fontSize: 13, margin: '8px 0 0' }}>Demo OTP: {devHint}</p>
        )}
        <p style={{ color: C.grey, fontSize: 12.5, margin: '8px 0 0' }}>
          Sign in to book a free test drive or reserve this car.
        </p>
        {error && <p style={{ color: C.coralDark, fontSize: 13, marginTop: 8 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        style={{ ...btnPrimary, width: '100%', padding: 15, fontSize: 16 }}
        disabled={busy}
        onClick={() => lead('TEST_DRIVE', 'Test drive request')}
      >
        Book a free test drive
      </button>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          style={{ ...btnGhost, flex: 1, justifyContent: 'center' }}
          disabled={busy}
          onClick={() => lead('FINANCE', 'Finance enquiry')}
        >
          Check finance
        </button>
        <button
          style={{ ...btnGhost, flex: 1, justifyContent: 'center' }}
          disabled={busy}
          onClick={save}
        >
          ♥ Save
        </button>
      </div>
      <button
        style={{
          background: 'none',
          border: 'none',
          color: C.grey,
          fontSize: 13,
          cursor: 'pointer',
          marginTop: 10,
          padding: 0,
        }}
        disabled={busy}
        onClick={() => lead('ENQUIRY', 'Enquiry')}
      >
        Ask a question
      </button>
      {msg && (
        <p style={{ color: C.indigo, fontWeight: 600, fontSize: 13.5, marginTop: 12 }}>{msg}</p>
      )}
      {error && <p style={{ color: C.coralDark, fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
