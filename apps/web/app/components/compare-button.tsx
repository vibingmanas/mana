'use client';

import { useEffect, useState } from 'react';
import { getCompare, toggleCompare, COMPARE_EVENT, COMPARE_MAX } from '../../lib/compare';
import { C } from '../../lib/ds';

/** Add/remove a car from the compare set. Safe to nest over a card (stops navigation). */
export default function CompareButton({
  id,
  variant = 'overlay',
}: {
  id: string;
  variant?: 'overlay' | 'inline';
}) {
  const [on, setOn] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const sync = () => {
      const ids = getCompare();
      setOn(ids.includes(id));
      setFull(ids.length >= COMPARE_MAX && !ids.includes(id));
    };
    sync();
    window.addEventListener(COMPARE_EVENT, sync);
    return () => window.removeEventListener(COMPARE_EVENT, sync);
  }, [id]);

  const base: React.CSSProperties =
    variant === 'overlay'
      ? {
          position: 'absolute',
          bottom: 12,
          right: 12,
          zIndex: 3,
          padding: '6px 11px',
          fontSize: 11.5,
        }
      : { padding: '10px 16px', fontSize: 14 };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCompare(id);
      }}
      title={full ? `Compare up to ${COMPARE_MAX} cars` : 'Add to compare'}
      style={{
        ...base,
        fontWeight: 700,
        borderRadius: 999,
        cursor: full ? 'not-allowed' : 'pointer',
        border: `1px solid ${on ? C.indigo : C.border}`,
        background: on ? C.indigo : 'rgba(255,255,255,.95)',
        color: on ? C.cream : C.indigo,
      }}
    >
      {on ? '✓ Comparing' : '+ Compare'}
    </button>
  );
}
