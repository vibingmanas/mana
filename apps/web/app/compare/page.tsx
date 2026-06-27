'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '../components/site-header';
import { getCompare, removeCompare, COMPARE_EVENT } from '../../lib/compare';
import { C, display, h1, inr } from '../../lib/ds';

interface Car {
  id: string;
  make: string | null;
  model: string | null;
  manufactureYear: number | null;
  odometerKm: number | null;
  ownersCount: number | null;
  price: number | null;
  city: string | null;
  fuelType: string | null;
  transmission: string | null;
  source: string | null;
  fairPriceLabel: string | null;
  riskScore: number | null;
  riskBand: string | null;
  media: { url: string }[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const FPI: Record<string, string> = {
  UNDERPRICED: 'Underpriced',
  FAIR: 'Fair',
  OVERPRICED: 'Above market',
};
const RISK: Record<string, string> = { LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High' };
const SRC: Record<string, string> = {
  DEALER: 'Dealer',
  INDIVIDUAL: 'Owner',
  AUCTION: 'Auction',
  PLATFORM: 'Platform',
};

function emi(price: number | null): string {
  if (!price) return '—';
  const loan = price * 0.8,
    r = 10.5 / 12 / 100,
    n = 60;
  return `₹${Math.round((loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)).toLocaleString('en-IN')}/mo`;
}

export default function Compare() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const fromQuery = new URLSearchParams(window.location.search).get('ids');
    const ids = (fromQuery ? fromQuery.split(',') : getCompare()).filter(Boolean);
    const fetched = await Promise.all(
      ids.map((id) =>
        fetch(`${API}/api/listings/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    );
    setCars(fetched.filter(Boolean) as Car[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const sync = () => load();
    window.addEventListener(COMPARE_EVENT, sync);
    return () => window.removeEventListener(COMPARE_EVENT, sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minPrice = Math.min(...cars.map((c) => c.price ?? Infinity));
  const minRisk = Math.min(...cars.map((c) => c.riskScore ?? Infinity));

  const rows: { label: string; render: (c: Car) => React.ReactNode; best?: (c: Car) => boolean }[] =
    [
      { label: 'Price', render: (c) => inr(c.price), best: (c) => c.price === minPrice },
      { label: 'Fair price', render: (c) => (c.fairPriceLabel ? FPI[c.fairPriceLabel] : '—') },
      {
        label: 'Risk score',
        render: (c) =>
          c.riskScore != null ? `${c.riskScore}/10 · ${RISK[c.riskBand ?? '']}` : '—',
        best: (c) => c.riskScore === minRisk,
      },
      { label: 'EMI', render: (c) => emi(c.price) },
      { label: 'Year', render: (c) => c.manufactureYear ?? '—' },
      {
        label: 'Km driven',
        render: (c) => (c.odometerKm ? `${(c.odometerKm / 1000).toFixed(0)}k` : '—'),
      },
      { label: 'Owners', render: (c) => c.ownersCount ?? '—' },
      { label: 'Seller', render: (c) => SRC[c.source ?? 'DEALER'] ?? c.source },
      { label: 'Fuel', render: (c) => c.fuelType ?? '—' },
      { label: 'Transmission', render: (c) => c.transmission ?? '—' },
      { label: 'City', render: (c) => c.city ?? '—' },
    ];

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SiteHeader />
      <main
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,32px) clamp(16px,4vw,40px) 100px',
        }}
      >
        <h1 style={{ ...h1, fontSize: 'clamp(26px,4vw,38px)' }}>Compare cars</h1>
        <p style={{ color: C.grey, fontSize: 15, margin: '6px 0 22px' }}>
          Side-by-side on price, fair value, risk and total cost — best value highlighted.
        </p>

        {loading ? (
          <p style={{ color: C.grey }}>Loading…</p>
        ) : cars.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: `1px solid ${C.border}`,
              borderRadius: 20,
              padding: '50px 24px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: C.grey, margin: '0 0 16px' }}>No cars selected to compare yet.</p>
            <Link
              href="/listings"
              style={{
                background: C.indigo,
                color: C.cream,
                padding: '12px 22px',
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Browse cars
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 520 }}
            >
              <thead>
                <tr>
                  <th style={{ width: 120 }} />
                  {cars.map((c) => (
                    <th key={c.id} style={{ padding: 10, verticalAlign: 'top', minWidth: 160 }}>
                      <div
                        style={{
                          background: '#fff',
                          border: `1px solid ${C.border}`,
                          borderRadius: 16,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ aspectRatio: '16/10', background: C.tint }}>
                          {c.media[0] && (
                            <img
                              src={c.media[0].url}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                        </div>
                        <div style={{ padding: '10px 12px' }}>
                          <div
                            style={{
                              fontFamily: display,
                              fontWeight: 800,
                              fontSize: 14,
                              color: C.text,
                              textAlign: 'left',
                            }}
                          >
                            {c.make} {c.model}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <Link
                              href={`/listings/${c.id}`}
                              style={{
                                color: C.coral,
                                fontSize: 12,
                                fontWeight: 700,
                                textDecoration: 'none',
                              }}
                            >
                              View
                            </Link>
                            <button
                              onClick={() => removeCompare(c.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: C.grey,
                                fontSize: 12,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td
                      style={{
                        padding: '12px 10px',
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: C.grey,
                        textTransform: 'uppercase',
                        letterSpacing: '.06em',
                      }}
                    >
                      {row.label}
                    </td>
                    {cars.map((c) => {
                      const best = row.best?.(c) && cars.length > 1;
                      return (
                        <td
                          key={c.id}
                          style={{
                            padding: '12px 12px',
                            textAlign: 'center',
                            fontSize: 14,
                            fontWeight: best ? 800 : 600,
                            color: best ? '#3B6B45' : C.text,
                            borderTop: `1px solid ${C.border}`,
                            background: best ? '#EEF5EE' : 'transparent',
                          }}
                        >
                          {row.render(c)}
                          {best ? ' ✓' : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
