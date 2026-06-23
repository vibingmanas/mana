'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../../lib/api';
import { C, display, h1, card, input, btnPrimary, btnInk, inr } from '../../../../lib/ds';
import OtpLogin from '../../../components/otp-login';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

interface Application {
  id: string;
  status: string;
  amount: number;
  downPayment: number;
  tenureMonths: number;
  partner: string | null;
  decisionReason?: string;
}

function emi(loan: number, rate: number, months: number): number {
  const r = rate / 12 / 100;
  return Math.round((loan * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
}

export default function FinanceFlow({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [down, setDown] = useState('');
  const [tenure, setTenure] = useState('48');
  const [app, setApp] = useState<Application | null>(null);
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    fetch(`${base}/api/listings/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          c: { price: number | null; make: string; model: string; manufactureYear: number } | null,
        ) => {
          if (!c) return;
          setPrice(c.price);
          setTitle(`${c.manufactureYear} ${c.make} ${c.model}`);
          if (c.price) {
            setAmount(String(c.price));
            setDown(String(Math.round(c.price * 0.2)));
          }
        },
      )
      .catch(() => {});
  }, [id]);

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

  const apply = () =>
    run(async () => {
      const r = await api<Application>('/finance/applications', {
        method: 'POST',
        body: {
          vehicleId: id,
          amount: Number(amount),
          downPayment: Number(down),
          tenureMonths: Number(tenure),
        },
        auth: true,
      });
      setApp(r);
    });

  const startSign = () =>
    run(async () => {
      const r = await api<{ signUrl: string; ref: string }>(
        `/finance/applications/${app!.id}/esign`,
        { method: 'POST', auth: true },
      );
      setSignUrl(r.signUrl);
      setRef(r.ref);
    });

  const complete = () =>
    run(async () => {
      await api(`/finance/applications/${app!.id}/esign/complete`, {
        method: 'POST',
        body: { ref },
        auth: true,
      });
      setDone(true);
    });

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(16px,3vw,28px)' }}>
      <Link
        href={`/listings/${id}`}
        style={{ color: C.grey, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
      >
        ← Back to listing
      </Link>
      <h1 style={{ ...h1, marginTop: 14 }}>Finance this car</h1>
      {title && <p style={{ margin: '6px 0 18px', color: C.grey, fontSize: 15 }}>{title}</p>}

      {authed === null ? null : !authed ? (
        <OtpLogin
          title="Sign in to apply"
          subtitle="We’ll get you an instant decision from our lending partners."
          role="BUYER"
          onAuthed={() => setAuthed(true)}
        />
      ) : done ? (
        <div style={{ ...card }}>
          <h2 style={{ fontFamily: display, fontSize: 20, color: '#3B6B45', margin: '0 0 8px' }}>
            ✓ Loan disbursed
          </h2>
          <p style={{ margin: 0, color: C.grey }}>
            Your loan agreement is signed and the loan is disbursed. The dealer will be in touch to
            complete delivery.
          </p>
          <Link
            href={`/listings/${id}`}
            style={{ ...btnInk, marginTop: 16, textDecoration: 'none' }}
          >
            Back to the car
          </Link>
        </div>
      ) : app ? (
        <div style={{ ...card }}>
          {app.status === 'APPROVED' ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  background: '#E9F0E9',
                  color: '#3B6B45',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '5px 12px',
                  borderRadius: 999,
                }}
              >
                Approved{app.partner ? ` · ${app.partner}` : ''}
              </span>
              <div
                style={{
                  fontFamily: display,
                  fontSize: 30,
                  fontWeight: 800,
                  color: C.indigo,
                  margin: '14px 0 2px',
                }}
              >
                ₹{emi(app.amount - app.downPayment, 10.5, app.tenureMonths).toLocaleString('en-IN')}
                <span style={{ fontSize: 15, color: C.grey, fontWeight: 700 }}> /mo</span>
              </div>
              <p style={{ margin: '0 0 16px', color: C.grey, fontSize: 14 }}>
                {inr(app.amount - app.downPayment)} loan · {app.tenureMonths} months ·{' '}
                {inr(app.downPayment)} down
              </p>
              {!signUrl ? (
                <button
                  style={{ ...btnPrimary, width: '100%' }}
                  disabled={busy}
                  onClick={startSign}
                >
                  E-sign the loan agreement
                </button>
              ) : (
                <div>
                  <a
                    href={signUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      ...btnInk,
                      width: '100%',
                      textDecoration: 'none',
                      justifyContent: 'center',
                    }}
                  >
                    Open the agreement to sign →
                  </a>
                  <button
                    style={{ ...btnPrimary, width: '100%', marginTop: 10 }}
                    disabled={busy}
                    onClick={complete}
                  >
                    I’ve signed — finish
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <span
                style={{
                  display: 'inline-block',
                  background: '#FBE9E6',
                  color: C.coralDark,
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '5px 12px',
                  borderRadius: 999,
                }}
              >
                Not approved
              </span>
              <p style={{ margin: '12px 0 0', color: C.text }}>
                {app.decisionReason ?? 'The lender could not approve this application.'}
              </p>
              <button
                style={{ ...btnInk, marginTop: 14 }}
                onClick={() => {
                  setApp(null);
                  setError(null);
                }}
              >
                Try different terms
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ ...card }}>
          <p style={{ margin: '0 0 14px', color: C.grey, fontSize: 14 }}>
            {price ? `On-road price ${inr(price)}. ` : ''}Down payment from 10%, tenure 12–84
            months.
          </p>
          <label style={{ fontSize: 13, color: C.grey, fontWeight: 600 }}>Loan amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ ...input, marginTop: 4 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: C.grey, fontWeight: 600 }}>Down payment</label>
              <input
                value={down}
                onChange={(e) => setDown(e.target.value)}
                style={{ ...input, marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: C.grey, fontWeight: 600 }}>
                Tenure (months)
              </label>
              <input
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                style={{ ...input, marginTop: 4 }}
              />
            </div>
          </div>
          <button
            style={{ ...btnPrimary, width: '100%', marginTop: 16 }}
            disabled={busy || !amount}
            onClick={apply}
          >
            {busy ? 'Checking…' : 'Get my decision'}
          </button>
        </div>
      )}
      {error && <p style={{ color: C.coralDark, fontSize: 13, marginTop: 12 }}>{error}</p>}
    </div>
  );
}
