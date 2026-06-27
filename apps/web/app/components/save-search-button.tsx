'use client';

import { useState } from 'react';
import { api, getToken, type ApiError } from '../../lib/api';
import { C, btnGhost } from '../../lib/ds';

/** Saves the current filter set as an alerting saved search. */
export default function SaveSearchButton({ query }: { query: Record<string, string> }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!getToken()) {
      setError('Sign in to save searches.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/buyer/saved-searches', {
        method: 'POST',
        body: { query: Object.keys(query).length ? query : { all: 'india' }, alertChannel: 'push' },
        auth: true,
      });
      setDone(true);
    } catch (e) {
      setError((e as ApiError)?.message ?? 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        style={{ ...btnGhost, padding: '8px 12px', fontSize: 13 }}
        disabled={busy || done}
        onClick={save}
      >
        {done ? '✓ Saved · alerts on' : '🔔 Save this search'}
      </button>
      {error && <span style={{ color: C.coralDark, fontSize: 12.5 }}>{error}</span>}
    </span>
  );
}
