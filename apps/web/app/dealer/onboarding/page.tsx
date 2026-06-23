'use client';

import { useEffect, useState } from 'react';
import { api, getToken, setTokens, type ApiError } from '../../../lib/api';
import { C, display, h1, card, input, btnInk, btnPrimary, trustBadge } from '../../../lib/ds';

interface OnboardingStatus {
  dealer: { id: string; displayName: string | null; status: string; verificationTier: string };
  completedSteps: string[];
  nextStep: string | null;
}

const STEP_LABELS: Record<string, string> = {
  phone: 'Phone',
  email: 'Email',
  aadhaar: 'Aadhaar',
  pan: 'PAN',
  gst: 'GST',
  bank: 'Bank',
};
const ALL_STEPS = ['phone', 'email', 'aadhaar', 'pan', 'gst', 'bank'];
const TIER_INFO: Record<string, string> = {
  T0: 'Registered — finish identity to publish listings',
  T1: 'Identity verified — publish listings & get leads',
  T2: 'Business verified — payouts, financing & verified badge',
  T3: 'Mana Certified — the top trust badge buyers look for',
};
const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

export default function DealerVerification() {
  const [phase, setPhase] = useState<'login' | 'wizard'>('login');
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('+91');
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [devHint, setDevHint] = useState<string | null>(null);

  useEffect(() => {
    if (getToken())
      api<OnboardingStatus>('/onboarding/status', { auth: true })
        .then((s) => {
          setStatus(s);
          setPhase('wizard');
        })
        .catch(() => {});
  }, []);

  const refreshStatus = async () =>
    setStatus(await api<OnboardingStatus>('/onboarding/status', { auth: true }));

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

  const requestOtp = () =>
    run(async () => {
      const res = await api<{ devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: { phone, purpose: 'onboarding' },
      });
      setOtpSent(true);
      if (res.devCode) {
        setDevHint(res.devCode);
        setCode(res.devCode);
      }
    });

  const verifyOtp = () =>
    run(async () => {
      const res = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', {
        method: 'POST',
        body: { phone, code, purpose: 'onboarding', role: 'DEALER_OWNER' },
      });
      setTokens(res.accessToken, res.refreshToken);
      await api('/onboarding/start', { method: 'POST', body: {}, auth: true });
      await refreshStatus();
      setPhase('wizard');
    });

  if (phase === 'login') {
    return (
      <section style={{ maxWidth: 460 }}>
        <h1 style={h1}>Dealer sign-in</h1>
        <p style={{ color: C.grey, margin: '6px 0 20px', fontSize: 14.5 }}>
          Verify your phone to start. New here? This also creates your dealership.
        </p>
        <div style={card}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.text,
              display: 'block',
              marginBottom: 8,
            }}
          >
            Phone (E.164)
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+9190000…"
            style={input}
          />
          {!otpSent ? (
            <button
              style={{ ...btnInk, width: '100%', marginTop: 14 }}
              disabled={busy}
              onClick={requestOtp}
            >
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          ) : (
            <>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  display: 'block',
                  margin: '14px 0 8px',
                }}
              >
                OTP
              </label>
              <input value={code} onChange={(e) => setCode(e.target.value)} style={input} />
              {devHint && (
                <p style={{ color: C.coral, fontSize: 13, margin: '8px 0 0' }}>
                  Demo OTP: {devHint}
                </p>
              )}
              <button
                style={{ ...btnInk, width: '100%', marginTop: 14 }}
                disabled={busy}
                onClick={verifyOtp}
              >
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
            </>
          )}
          {error && <p style={{ color: C.coralDark, marginTop: 14 }}>{error}</p>}
        </div>
      </section>
    );
  }

  const tier = status?.dealer.verificationTier ?? 'T0';

  return (
    <section>
      <h1 style={h1}>Verification</h1>
      <p style={{ color: C.grey, margin: '5px 0 18px', fontSize: 14.5 }}>{TIER_INFO[tier]}</p>

      <div
        style={{
          background: C.indigo,
          borderRadius: 18,
          padding: 20,
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {ALL_STEPS.map((s) => {
          const done = status?.completedSteps.includes(s);
          return (
            <span
              key={s}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                background: done ? C.cream : 'rgba(250,246,239,.12)',
                color: done ? C.indigo : 'rgba(250,246,239,.7)',
              }}
            >
              {done ? '✓ ' : ''}
              {STEP_LABELS[s]}
            </span>
          );
        })}
        <span style={{ marginLeft: 'auto', ...trustBadge }}>Tier {tier}</span>
      </div>

      <StepForms busy={busy} run={run} refreshStatus={refreshStatus} />
      {error && <p style={{ color: C.coralDark, marginTop: 16 }}>{error}</p>}
    </section>
  );
}

function StepForms({
  busy,
  run,
  refreshStatus,
}: {
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  refreshStatus: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');
  const [gst, setGst] = useState('');
  const [acct, setAcct] = useState('');
  const [ifsc, setIfsc] = useState('');

  const requestEmail = () =>
    run(async () => {
      const res = await api<{ devCode?: string }>('/onboarding/email/request-otp', {
        method: 'POST',
        body: { email },
        auth: true,
      });
      setEmailSent(true);
      if (res.devCode) {
        setEmailHint(res.devCode);
        setEmailCode(res.devCode);
      }
    });
  const verifyEmail = () =>
    run(async () => {
      await api('/onboarding/email/verify', {
        method: 'POST',
        body: { email, code: emailCode },
        auth: true,
      });
      await refreshStatus();
    });
  const submit = (path: string, b: unknown) =>
    run(async () => {
      await api(path, { method: 'POST', body: b, auth: true });
      await refreshStatus();
    });

  const digilocker = () =>
    run(async () => {
      const r = await api<{ consentUrl: string; state: string; live: boolean }>(
        '/onboarding/aadhaar/digilocker/initiate',
        { method: 'POST', auth: true },
      );
      if (r.live) {
        // Real flow: hand off to DigiLocker's consent page.
        window.location.href = r.consentUrl;
        return;
      }
      // Mock flow: the consent URL already carries a code — complete in place.
      const code = new URL(r.consentUrl).searchParams.get('code') ?? '';
      await api('/onboarding/aadhaar/digilocker/callback', {
        method: 'POST',
        body: { code, state: r.state },
        auth: true,
      });
      await refreshStatus();
    });

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Card title="Email">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@dealership.in"
          style={input}
        />
        {!emailSent ? (
          <button style={{ ...btnPrimary, marginTop: 12 }} disabled={busy} onClick={requestEmail}>
            Send email OTP
          </button>
        ) : (
          <>
            <input
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
              placeholder="OTP"
              style={{ ...input, marginTop: 10 }}
            />
            {emailHint && (
              <p style={{ color: C.coral, fontSize: 13, margin: '8px 0 0' }}>
                Demo OTP: {emailHint}
              </p>
            )}
            <button style={{ ...btnPrimary, marginTop: 12 }} disabled={busy} onClick={verifyEmail}>
              Verify email
            </button>
          </>
        )}
      </Card>

      <Card
        title="Aadhaar"
        privacy="Via DigiLocker consent — we never store your full Aadhaar number."
      >
        <input
          value={aadhaar}
          onChange={(e) => setAadhaar(e.target.value)}
          placeholder="12-digit Aadhaar"
          style={input}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button style={btnInk} disabled={busy} onClick={digilocker}>
            Verify with DigiLocker
          </button>
          <button
            style={btnPrimary}
            disabled={busy || aadhaar.length !== 12}
            onClick={() => submit('/onboarding/aadhaar', { aadhaarNumber: aadhaar })}
          >
            Verify Aadhaar
          </button>
        </div>
      </Card>

      <Card title="PAN">
        <input
          value={pan}
          onChange={(e) => setPan(e.target.value.toUpperCase())}
          placeholder="ABCDE1234F"
          style={input}
        />
        <button
          style={{ ...btnPrimary, marginTop: 12 }}
          disabled={busy}
          onClick={() => submit('/onboarding/pan', { pan })}
        >
          Verify PAN
        </button>
      </Card>

      <Card title="GST">
        <input
          value={gst}
          onChange={(e) => setGst(e.target.value.toUpperCase())}
          placeholder="15-character GSTIN"
          style={input}
        />
        <button
          style={{ ...btnPrimary, marginTop: 12 }}
          disabled={busy}
          onClick={() => submit('/onboarding/gst', { gstin: gst })}
        >
          Verify GST
        </button>
      </Card>

      <Card title="Bank account">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input
            value={acct}
            onChange={(e) => setAcct(e.target.value)}
            placeholder="Account number"
            style={input}
          />
          <input
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value.toUpperCase())}
            placeholder="IFSC"
            style={input}
          />
        </div>
        <button
          style={{ ...btnPrimary, marginTop: 12 }}
          disabled={busy}
          onClick={() => submit('/onboarding/bank', { accountNumber: acct, ifsc })}
        >
          Verify bank (penny drop)
        </button>
      </Card>
    </div>
  );
}

function Card({
  title,
  privacy,
  children,
}: {
  title: string;
  privacy?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={card}>
      <strong
        style={{
          display: 'block',
          fontFamily: display,
          fontSize: 16,
          color: C.indigo,
          marginBottom: 12,
        }}
      >
        {title}
      </strong>
      {privacy && <p style={{ fontSize: 12.5, color: C.grey, margin: '0 0 12px' }}>{privacy}</p>}
      {children}
    </section>
  );
}
