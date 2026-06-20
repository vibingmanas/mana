'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';

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

  if (authed === null) return <Shell>Loading…</Shell>;
  if (!authed)
    return (
      <Shell>
        <p>
          Sign in from any <Link href="/listings">listing</Link> to see your alerts.
        </p>
      </Shell>
    );

  return (
    <Shell>
      <h1>
        Notifications {unread > 0 && <span style={{ color: 'var(--accent)' }}>({unread})</span>}
      </h1>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {items.map((n) => (
          <div
            key={n.id}
            style={{
              background: 'var(--card)',
              borderRadius: 12,
              padding: '1rem',
              opacity: n.read ? 0.6 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{n.title}</strong>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                {new Date(n.createdAt).toLocaleString('en-IN')}
              </span>
            </div>
            <p style={{ color: 'var(--muted)', margin: '6px 0' }}>{n.body}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {n.vehicleId && (
                <Link href={`/listings/${n.vehicleId}`} style={{ fontSize: 13 }}>
                  View car →
                </Link>
              )}
              {!n.read && (
                <button
                  onClick={() => markRead(n.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p style={{ color: 'var(--muted)' }}>No notifications yet.</p>}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2.5rem 1.5rem' }}>{children}</main>
  );
}
