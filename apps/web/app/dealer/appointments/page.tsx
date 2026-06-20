'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, display, h1, card, btnInk, btnGhost } from '../../../lib/ds';

interface Appt {
  id: string;
  type: string;
  scheduledStart: string;
  status: string;
  vehicle: { make: string | null; model: string | null; regNumber?: string } | null;
}
const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  REQUESTED: { background: '#FBE9E6', color: C.coralDark },
  CONFIRMED: { background: C.tint, color: C.indigo },
  COMPLETED: { background: '#E9F0E9', color: '#3B6B45' },
  NO_SHOW: { background: C.cream2, color: C.grey },
  CANCELLED: { background: C.cream2, color: C.grey },
};

export default function DealerAppointments() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);
  const load = async () => setAppts(await api<Appt[]>('/dealer/appointments', { auth: true }));
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

  const setStandardHours = () =>
    run(() =>
      api('/dealer/availability', {
        method: 'PUT',
        auth: true,
        body: {
          windows: [1, 2, 3, 4, 5, 6].map((weekday) => ({
            weekday,
            startMinute: 600,
            endMinute: 1080,
            slotMinutes: 30,
            doorstepEnabled: true,
            doorstepRadiusKm: 15,
          })),
        },
      }),
    );

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

  return (
    <section>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={h1}>Appointments</h1>
          <p style={{ margin: '5px 0 0', color: C.grey, fontSize: 14.5 }}>Test drives & visits</p>
        </div>
        <button style={btnInk} disabled={busy} onClick={setStandardHours}>
          Set Mon–Sat 10:00–18:00 availability
        </button>
      </div>
      {error && <p style={{ color: C.coralDark }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {appts.map((a) => (
          <div
            key={a.id}
            style={{ ...card, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}
          >
            <div style={{ flex: '1 1 200px', minWidth: 160 }}>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 15, color: C.text }}>
                {a.vehicle?.make} {a.vehicle?.model}{' '}
                {a.vehicle?.regNumber ? `· ${a.vehicle.regNumber}` : ''}
              </div>
              <div style={{ fontSize: 12.5, color: C.grey, marginTop: 3 }}>
                {a.type.replace('_', ' ').toLowerCase()} ·{' '}
                {new Date(a.scheduledStart).toLocaleString('en-IN')}
              </div>
            </div>
            <span
              style={{
                ...(STATUS_STYLE[a.status] ?? STATUS_STYLE.REQUESTED),
                fontSize: 11.5,
                fontWeight: 700,
                padding: '4px 11px',
                borderRadius: 999,
              }}
            >
              {a.status.replace('_', ' ').toLowerCase()}
            </span>
            <div style={{ display: 'flex', gap: 7 }}>
              {(a.status === 'REQUESTED' || a.status === 'RESCHEDULED') && (
                <button
                  style={btnInk}
                  disabled={busy}
                  onClick={() =>
                    run(() => api(`/appointments/${a.id}/confirm`, { method: 'POST', auth: true }))
                  }
                >
                  Confirm
                </button>
              )}
              {a.status === 'CONFIRMED' && (
                <>
                  <button
                    style={btnInk}
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        api(`/appointments/${a.id}/complete`, {
                          method: 'POST',
                          body: { showed: true, outcome: 'interested' },
                          auth: true,
                        }),
                      )
                    }
                  >
                    Mark showed
                  </button>
                  <button
                    style={btnGhost}
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        api(`/appointments/${a.id}/complete`, {
                          method: 'POST',
                          body: { showed: false },
                          auth: true,
                        }),
                      )
                    }
                  >
                    No-show
                  </button>
                </>
              )}
              {!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status) && (
                <button
                  style={btnGhost}
                  disabled={busy}
                  onClick={() =>
                    run(() => api(`/appointments/${a.id}/cancel`, { method: 'POST', auth: true }))
                  }
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
        {appts.length === 0 && (
          <p style={{ color: C.grey }}>No appointments yet. Set availability so buyers can book.</p>
        )}
      </div>
    </section>
  );
}
