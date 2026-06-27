'use client';

import { useState } from 'react';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, btnInk } from '../../../lib/ds';

export default function AlertButton({
  city,
  state,
  source,
}: {
  city?: string | null;
  state?: string | null;
  source?: string;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = async () => {
    if (!getToken()) {
      setError('Sign in (from any listing) to set alerts.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/auctions/alerts', {
        method: 'POST',
        body: { city: city ?? undefined, state: state ?? undefined, source },
        auth: true,
      });
      setDone(true);
    } catch (e) {
      setError((e as ApiError)?.message ?? 'Could not set alert');
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <p style={{ color: '#3B6B45', fontWeight: 600, fontSize: 14 }}>
        ✓ Alert set — we’ll notify you about similar auctions.
      </p>
    );

  return (
    <div>
      <button style={{ ...btnInk, width: '100%' }} disabled={busy} onClick={set}>
        Set an auction alert
      </button>
      {error && <p style={{ color: C.coralDark, fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
