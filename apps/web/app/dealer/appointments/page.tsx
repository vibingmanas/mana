'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';

interface Appt {
  id: string;
  type: string;
  scheduledStart: string;
  status: string;
  vehicle: { make: string | null; model: string | null; regNumber?: string } | null;
}

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

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

  if (authed === null) return <Shell>Loading…</Shell>;
  if (!authed)
    return (
      <Shell>
        <p>
          Please <Link href="/dealer/onboarding">sign in as a dealer</Link> first.
        </p>
      </Shell>
    );

  return (
    <Shell>
      <h1>Appointments</h1>
      <button style={btn} disabled={busy} onClick={setStandardHours}>
        Set Mon–Sat 10:00–18:00 availability
      </button>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {appts.map((a) => (
          <div key={a.id} style={{ background: 'var(--card)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>
                {a.vehicle?.make} {a.vehicle?.model}{' '}
                {a.vehicle?.regNumber ? `· ${a.vehicle.regNumber}` : ''}
              </strong>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{a.status}</span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0' }}>
              {a.type} · {new Date(a.scheduledStart).toLocaleString('en-IN')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(a.status === 'REQUESTED' || a.status === 'RESCHEDULED') && (
                <button
                  style={sm}
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
                    style={sm}
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
                    style={sm}
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
                  style={sm}
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
        {appts.length === 0 && <p style={{ color: 'var(--muted)' }}>No appointments yet.</p>}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem' }}>{children}</main>
  );
}
const btn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent)',
  color: '#04201c',
  fontWeight: 600,
  cursor: 'pointer',
};
const sm: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'transparent',
  color: 'var(--fg)',
  cursor: 'pointer',
  fontSize: 13,
};
