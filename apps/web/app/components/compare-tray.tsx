'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCompare, clearCompare, COMPARE_EVENT } from '../../lib/compare';
import { C, display } from '../../lib/ds';

/** Floating tray showing the current compare set with a link to /compare. */
export default function CompareTray() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(getCompare());
    sync();
    window.addEventListener(COMPARE_EVENT, sync);
    return () => window.removeEventListener(COMPARE_EVENT, sync);
  }, []);

  if (ids.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        background: C.indigo,
        color: C.cream,
        borderRadius: 16,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 16px 40px rgba(31,39,71,.3)',
      }}
    >
      <span style={{ fontFamily: display, fontWeight: 800, fontSize: 14 }}>
        {ids.length} car{ids.length > 1 ? 's' : ''} to compare
      </span>
      <Link
        href={`/compare?ids=${ids.join(',')}`}
        style={{
          background: C.coral,
          color: '#fff',
          fontWeight: 700,
          fontSize: 13.5,
          padding: '8px 16px',
          borderRadius: 10,
          textDecoration: 'none',
        }}
      >
        Compare →
      </Link>
      <button
        onClick={() => clearCompare()}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(250,246,239,.7)',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        Clear
      </button>
    </div>
  );
}
