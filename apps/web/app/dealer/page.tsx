'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../lib/api';
import { C, display, card, h1, eyebrow, btnPrimary } from '../../lib/ds';

interface Dashboard {
  dealer: { verificationTier: string };
  liveListings: number;
  newLeads: number;
  upcomingAppointments: number;
  salesThisMonth: number;
}
interface Lead {
  id: string;
  intent: string;
  status: string;
  vehicle: { make: string | null; model: string | null } | null;
  buyer: { user: { name: string | null; phone: string } } | null;
}
const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

const INTENT_STYLE: Record<string, React.CSSProperties> = {
  TEST_DRIVE: { background: C.tint, color: C.indigo },
  FINANCE: { background: '#FBE9E6', color: C.coralDark },
  ENQUIRY: { background: C.cream2, color: C.grey },
};

export default function DealerHome() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [d, setD] = useState<Dashboard | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setAuthed(!!getToken()), []);
  useEffect(() => {
    if (!authed) return;
    api<Dashboard>('/dealer/dashboard', { auth: true })
      .then(setD)
      .catch((e) => setError(errMsg(e)));
    api<{ leads: Lead[] }>('/dealer/leads', { auth: true })
      .then((r) => setLeads(r.leads.slice(0, 5)))
      .catch(() => {});
  }, [authed]);

  if (authed === null) return <p style={{ color: C.grey }}>Loading…</p>;
  if (!authed)
    return (
      <p style={{ color: C.grey }}>
        Please{' '}
        <Link href="/dealer/onboarding" style={{ color: C.coral }}>
          sign in as a dealer
        </Link>{' '}
        to see your dashboard.
      </p>
    );

  const tier = d?.dealer.verificationTier ?? 'T0';
  const stats = [
    { label: 'Live listings', value: d?.liveListings ?? 0 },
    { label: 'New leads', value: d?.newLeads ?? 0 },
    { label: 'Upcoming test drives', value: d?.upcomingAppointments ?? 0 },
    { label: 'Sales this month', value: d?.salesThisMonth ?? 0 },
  ];

  return (
    <section>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 22,
        }}
      >
        <div>
          <div style={{ ...eyebrow, marginBottom: 7 }}>Your dealership</div>
          <h1 style={{ ...h1, fontSize: 'clamp(26px,3.4vw,36px)' }}>Good to see you</h1>
        </div>
        <Link href="/dealer/cars" style={{ ...btnPrimary, textDecoration: 'none' }}>
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
        </Link>
      </div>

      {tier !== 'T3' && (
        <div
          style={{
            background: C.indigo,
            borderRadius: 18,
            padding: '18px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <div
              style={{
                fontFamily: display,
                fontWeight: 800,
                fontSize: 16,
                color: C.cream,
                marginBottom: 3,
              }}
            >
              Finish verification to climb the trust ladder
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(250,246,239,.72)' }}>
              Certified dealers rank higher and win more leads. You're on tier {tier}.
            </div>
          </div>
          <Link
            href="/dealer/onboarding"
            style={{
              background: C.cream,
              color: C.indigo,
              borderRadius: 12,
              padding: '12px 18px',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Continue verification →
          </Link>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
          gap: 14,
          marginBottom: 16,
        }}
      >
        {stats.map((s) => (
          <div key={s.label} style={card}>
            <div
              style={{
                fontFamily: display,
                fontSize: 30,
                fontWeight: 800,
                color: C.indigo,
                letterSpacing: '-.02em',
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 13, color: C.grey, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {error && <p style={{ color: C.coralDark }}>{error}</p>}

      <div style={{ ...card, borderRadius: 20, padding: 22 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 17, color: C.indigo }}>
            New leads
          </div>
          <Link
            href="/dealer/leads"
            style={{ color: C.coral, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
          >
            Open pipeline →
          </Link>
        </div>
        <div>
          {leads.map((l) => {
            const nm = l.buyer?.user.name ?? l.buyer?.user.phone ?? 'Buyer';
            return (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 4px',
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: C.tint,
                    color: C.indigo,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                    flex: '0 0 auto',
                  }}
                >
                  {nm.charAt(0).toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{nm}</div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: C.grey,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {l.vehicle?.make} {l.vehicle?.model}
                  </div>
                </div>
                <span
                  style={{
                    ...(INTENT_STYLE[l.intent] ?? INTENT_STYLE.ENQUIRY),
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {l.intent.replace('_', ' ').toLowerCase()}
                </span>
              </div>
            );
          })}
          {leads.length === 0 && <p style={{ color: C.grey, margin: '8px 0 0' }}>No leads yet.</p>}
        </div>
      </div>
    </section>
  );
}
