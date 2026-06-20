'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '../../components/site-header';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, display, h1, card } from '../../../lib/ds';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  vehicleId: string | null;
  read: boolean;
  createdAt: string;
}
const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

export default function BuyerNotifications() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setAuthed(!!getToken()), []);
  const load = async () => {
    const r = await api<{ unread: number; items: Notif[] }>('/buyer/notifications', { auth: true });
    setItems(r.items);
    setUnread(r.unread);
  };
  useEffect(() => {
    if (authed) load().catch((e) => setError(errMsg(e)));
  }, [authed]);

  async function markRead(id: string) {
    await api(`/buyer/notifications/${id}/read`, { method: 'POST', auth: true });
    await load();
  }

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SiteHeader />
      <main
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,32px) clamp(16px,4vw,40px) 80px',
        }}
      >
        {authed === null ? (
          <p style={{ color: C.grey }}>Loading…</p>
        ) : !authed ? (
          <p style={{ color: C.grey }}>
            Sign in from any{' '}
            <Link href="/listings" style={{ color: C.coral }}>
              listing
            </Link>{' '}
            to see your alerts.
          </p>
        ) : (
          <>
            <h1 style={h1}>
              Notifications {unread > 0 && <span style={{ color: C.coral }}>({unread})</span>}
            </h1>
            {error && <p style={{ color: C.coralDark }}>{error}</p>}
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {items.map((n) => (
                <div key={n.id} style={{ ...card, opacity: n.read ? 0.65 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <strong style={{ fontFamily: display, color: C.indigo }}>{n.title}</strong>
                    <span style={{ color: C.grey, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(n.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <p style={{ color: C.grey, margin: '6px 0' }}>{n.body}</p>
                  <div style={{ display: 'flex', gap: 14 }}>
                    {n.vehicleId && (
                      <Link
                        href={`/listings/${n.vehicleId}`}
                        style={{ fontSize: 13, color: C.coral }}
                      >
                        View car →
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: C.indigo,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                          padding: 0,
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && <p style={{ color: C.grey }}>No notifications yet.</p>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
