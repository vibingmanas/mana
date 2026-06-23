'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, display, h1, card, input, btnPrimary, btnGhost } from '../../../lib/ds';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; phone: string };
}
interface Roster {
  owner: { id: string; name: string | null; phone: string } | null;
  staff: Member[];
}

export default function DealerStaff() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [phone, setPhone] = useState('+91');
  const [role, setRole] = useState('SALES');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);
  const load = async () => setRoster(await api<Roster>('/dealer/staff', { auth: true }));
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
      <h1 style={h1}>Staff</h1>
      <p style={{ margin: '5px 0 18px', color: C.grey, fontSize: 14.5 }}>
        Add managers and sales staff. They sign in with their phone and get scoped access to your
        DMS.
      </p>
      {error && <p style={{ color: C.coralDark }}>{error}</p>}

      <div style={{ ...card, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91…"
            style={{ ...input, flex: '1 1 180px' }}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ ...input, flex: '0 0 150px' }}
          >
            <option value="SALES">Sales</option>
            <option value="MANAGER">Manager</option>
          </select>
          <button
            style={btnPrimary}
            disabled={busy || phone.length < 8}
            onClick={() =>
              run(() =>
                api('/dealer/staff', { method: 'POST', body: { phone, role }, auth: true }).then(
                  () => setPhone('+91'),
                ),
              )
            }
          >
            Add staff
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {roster?.owner && (
          <div
            style={{
              ...card,
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontFamily: display, fontWeight: 800, color: C.text }}>
              {roster.owner.name ?? roster.owner.phone}
            </span>
            <span style={{ color: C.grey, fontSize: 13 }}>Owner</span>
          </div>
        )}
        {roster?.staff.map((m) => (
          <div
            key={m.id}
            style={{
              ...card,
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div>
              <span style={{ fontFamily: display, fontWeight: 800, color: C.text }}>
                {m.user.name ?? m.user.phone}
              </span>
              <span style={{ color: C.grey, fontSize: 13 }}> · {m.role.toLowerCase()}</span>
            </div>
            <button
              style={{ ...btnGhost, padding: '6px 12px' }}
              disabled={busy}
              onClick={() =>
                run(() => api(`/dealer/staff/${m.id}`, { method: 'DELETE', auth: true }))
              }
            >
              Remove
            </button>
          </div>
        ))}
        {roster && roster.staff.length === 0 && (
          <p style={{ color: C.grey }}>No staff yet. Add your first above.</p>
        )}
      </div>
    </section>
  );
}
