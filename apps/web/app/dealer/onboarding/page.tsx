'use client';

import { useState } from 'react';
import { api, setTokens, type ApiError } from '../../../lib/api';

interface OnboardingStatus {
  dealer: {
    id: string;
    displayName: string | null;
    status: string;
    verificationTier: string;
  };
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
  T1: 'Identity verified — you can publish listings & get leads',
  T2: 'Business verified — payouts, financing & Verified Dealer badge',
  T3: 'Mana Certified',
};

function errMsg(e: unknown): string {
  return (e as ApiError)?.message ?? 'Something went wrong';
}

export default function DealerOnboarding() {
  const [phase, setPhase] = useState<'login' | 'wizard'>('login');
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // login state
  const [phone, setPhone] = useState('+91');
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [devHint, setDevHint] = useState<string | null>(null);

  async function refreshStatus() {
    setStatus(await api<OnboardingStatus>('/onboarding/status', { auth: true }));
  }

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
      <Shell title="Dealer onboarding" subtitle="Sign in with your phone to get started.">
        <Field label="Phone (E.164)">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+9190000..."
            style={inputStyle}
          />
        </Field>
        {!otpSent ? (
          <button style={btnStyle} disabled={busy} onClick={requestOtp}>
            {busy ? 'Sending…' : 'Send OTP'}
          </button>
        ) : (
          <>
            <Field label="OTP">
              <input value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle} />
            </Field>
            {devHint && <p style={hintStyle}>Dev OTP: {devHint}</p>}
            <button style={btnStyle} disabled={busy} onClick={verifyOtp}>
              {busy ? 'Verifying…' : 'Verify & continue'}
            </button>
          </>
        )}
        {error && <p style={errStyle}>{error}</p>}
      </Shell>
    );
  }

  return (
    <Shell
      title="Dealer onboarding"
      subtitle={status ? TIER_INFO[status.dealer.verificationTier] : ''}
    >
      {status && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {ALL_STEPS.map((s) => {
            const done = status.completedSteps.includes(s);
            return (
              <span
                key={s}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 13,
                  background: done ? 'rgba(45,212,191,0.18)' : 'rgba(255,255,255,0.06)',
                  color: done ? 'var(--accent)' : 'var(--muted)',
                  border: `1px solid ${done ? 'var(--accent)' : 'transparent'}`,
                }}
              >
                {done ? '✓ ' : ''}
                {STEP_LABELS[s]}
              </span>
            );
          })}
          <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
            Tier {status.dealer.verificationTier}
          </span>
        </div>
      )}

      <StepForms busy={busy} run={run} refreshStatus={refreshStatus} />
      {error && <p style={errStyle}>{error}</p>}
    </Shell>
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

  const submit = (path: string, body: unknown) =>
    run(async () => {
      await api(path, { method: 'POST', body, auth: true });
      await refreshStatus();
    });

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Card title="Email">
        <Field label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </Field>
        {!emailSent ? (
          <button style={btnStyle} disabled={busy} onClick={requestEmail}>
            Send email OTP
          </button>
        ) : (
          <>
            <Field label="OTP">
              <input
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                style={inputStyle}
              />
            </Field>
            {emailHint && <p style={hintStyle}>Dev OTP: {emailHint}</p>}
            <button style={btnStyle} disabled={busy} onClick={verifyEmail}>
              Verify email
            </button>
          </>
        )}
      </Card>

      <Card title="Aadhaar (DigiLocker — mock)">
        <Field label="Aadhaar number (12 digits)">
          <input value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} style={inputStyle} />
        </Field>
        <button
          style={btnStyle}
          disabled={busy}
          onClick={() => submit('/onboarding/aadhaar', { aadhaarNumber: aadhaar })}
        >
          Verify Aadhaar
        </button>
      </Card>

      <Card title="PAN">
        <Field label="PAN">
          <input
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase())}
            style={inputStyle}
          />
        </Field>
        <button style={btnStyle} disabled={busy} onClick={() => submit('/onboarding/pan', { pan })}>
          Verify PAN
        </button>
      </Card>

      <Card title="GST">
        <Field label="GSTIN (15 chars)">
          <input
            value={gst}
            onChange={(e) => setGst(e.target.value.toUpperCase())}
            style={inputStyle}
          />
        </Field>
        <button
          style={btnStyle}
          disabled={busy}
          onClick={() => submit('/onboarding/gst', { gstin: gst })}
        >
          Verify GST
        </button>
      </Card>

      <Card title="Bank account">
        <Field label="Account number">
          <input value={acct} onChange={(e) => setAcct(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="IFSC">
          <input
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value.toUpperCase())}
            style={inputStyle}
          />
        </Field>
        <button
          style={btnStyle}
          disabled={busy}
          onClick={() => submit('/onboarding/bank', { accountNumber: acct, ifsc })}
        >
          Verify bank (penny drop)
        </button>
      </Card>
    </div>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ marginBottom: 4 }}>{title}</h1>
      {subtitle && <p style={{ color: 'var(--muted)', marginTop: 0 }}>{subtitle}</p>}
      <div style={{ marginTop: 24 }}>{children}</div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--card)', borderRadius: 12, padding: '1.25rem' }}>
      <strong style={{ display: 'block', marginBottom: 12 }}>{title}</strong>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#0b1020',
  color: 'var(--fg)',
  fontSize: 15,
};
const btnStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent)',
  color: '#04201c',
  fontWeight: 600,
  cursor: 'pointer',
};
const hintStyle: React.CSSProperties = { color: 'var(--accent)', fontSize: 13, margin: '4px 0' };
const errStyle: React.CSSProperties = { color: '#f87171', marginTop: 16 };
