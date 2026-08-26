'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken } from '../../lib/api';
import { toggleCompare, getCompare, COMPARE_EVENT, COMPARE_MAX } from '../../lib/compare';
import { C, display } from '../../lib/ds';

export interface CardVehicle {
  id: string;
  make: string | null;
  model: string | null;
  variant: string | null;
  manufactureYear: number | null;
  odometerKm: number | null;
  ownersCount: number | null;
  price: number | null;
  valuationFair: number | null;
  city: string | null;
  state: string | null;
  regState: string | null;
  fuelType: string | null;
  transmission: string | null;
  source: string | null;
  sellerName: string | null;
  fairPriceLabel: string | null;
  riskBand: string | null;
  accidentFree: boolean | null;
  media: { url: string }[];
  certification?: { tier: string } | null;
  dealer?: { displayName: string | null; city: string | null } | null;
}

const RISK_COLOR: Record<string, string> = {
  LOW: '#3B6B45',
  MODERATE: '#9A6B00',
  HIGH: C.coralDark,
};
const SRC: Record<string, string> = {
  DEALER: 'Dealer',
  INDIVIDUAL: 'Owner',
  AUCTION: 'Auction',
  PLATFORM: 'Platform',
};

function lakh(n: number | null): string {
  if (!n) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lakh`;
  return `₹${n.toLocaleString('en-IN')}`;
}
function emiMonthly(price: number | null): number {
  if (!price) return 0;
  const loan = price * 0.8,
    r = 10.5 / 12 / 100,
    n = 60;
  return Math.round((loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

/** Reason line: the strongest 1–2 value signals for the car. */
function reasons(v: CardVehicle): string {
  const out: string[] = [];
  if (v.fairPriceLabel === 'UNDERPRICED') out.push('Underpriced');
  else if (v.fairPriceLabel === 'FAIR') out.push('Fair price');
  if (v.riskBand === 'LOW') out.push('Low risk');
  if (v.accidentFree === true) out.push('Accident-free');
  if ((v.ownersCount ?? 9) === 1) out.push('1 owner');
  return out.slice(0, 3).join(' · ') || 'Verified listing';
}

export default function ListingCard({ v }: { v: CardVehicle }) {
  const [saved, setSaved] = useState(false);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const sync = () => setComparing(getCompare().includes(v.id));
    sync();
    window.addEventListener(COMPARE_EVENT, sync);
    return () => window.removeEventListener(COMPARE_EVENT, sync);
  }, [v.id]);

  const drop =
    v.valuationFair && v.price && v.valuationFair > v.price ? v.valuationFair - v.price : 0;
  const emi = emiMonthly(v.price);
  const hub = v.dealer?.displayName ?? v.sellerName ?? SRC[v.source ?? 'DEALER'];
  const hubCity = v.dealer?.city ?? v.city ?? v.state ?? '';
  const chips = [
    v.odometerKm ? `${(v.odometerKm / 1000).toFixed(1)}K km` : null,
    v.fuelType,
    v.transmission,
    v.regState ?? (v.city ? v.city.slice(0, 4) : null),
  ].filter(Boolean) as string[];

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!getToken()) {
      window.location.href = '/account';
      return;
    }
    try {
      if (saved) {
        await api(`/buyer/wishlist/${v.id}`, { method: 'DELETE', auth: true });
        setSaved(false);
      } else {
        await api('/buyer/wishlist', { method: 'POST', body: { vehicleId: v.id }, auth: true });
        setSaved(true);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 6px 20px rgba(31,39,71,.05)',
      }}
    >
      <Link
        href={`/listings/${v.id}`}
        aria-label={`${v.make ?? ''} ${v.model ?? ''}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      />

      {/* Image with curved bottom */}
      <div style={{ position: 'relative', height: 190, background: '#eceff3' }}>
        {v.media?.[0] && (
          <img
            src={v.media[0].url}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            bottom: -1,
            left: 0,
            right: 0,
            height: 34,
            background: '#fff',
            borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
          }}
        />
        {drop > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              background: '#fff',
              border: `1px solid ${C.coral}`,
              color: C.coralDark,
              fontWeight: 700,
              fontSize: 12.5,
              padding: '5px 12px',
              borderRadius: 999,
            }}
          >
            ₹{drop.toLocaleString('en-IN')} ↓
          </span>
        )}
        <button
          onClick={toggleSave}
          aria-label="Save"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 3,
            width: 38,
            height: 38,
            borderRadius: 999,
            border: 'none',
            background: 'rgba(255,255,255,.92)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={saved ? C.coral : 'none'}
            stroke={saved ? C.coral : C.indigo}
            strokeWidth="2"
          >
            <path d="M12 21C12 21 3 14 3 8a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 6-9 13-9 13Z" />
          </svg>
        </button>
        <span
          style={{
            position: 'absolute',
            bottom: 8,
            left: 14,
            zIndex: 2,
            background: 'rgba(31,39,71,.88)',
            color: C.cream,
            fontWeight: 700,
            fontSize: 10.5,
            padding: '4px 9px',
            borderRadius: 999,
          }}
        >
          {SRC[v.source ?? 'DEALER'] ?? 'Dealer'}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 18px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: display,
                fontWeight: 800,
                fontSize: 17,
                color: C.indigo,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {v.manufactureYear} {v.make} {v.model}
            </div>
            <div style={{ fontSize: 13, color: C.grey, marginTop: 2 }}>{v.variant ?? ' '}</div>
          </div>
          <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
            {drop > 0 && v.valuationFair && (
              <div style={{ fontSize: 12.5, color: C.grey, textDecoration: 'line-through' }}>
                {lakh(v.valuationFair)}
              </div>
            )}
            <div style={{ fontFamily: display, fontWeight: 800, fontSize: 20, color: C.indigo }}>
              {lakh(v.price)}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: C.grey, marginTop: 4 }}>
          EMI ₹{emi.toLocaleString('en-IN')}/m*
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {chips.map((c, i) => (
            <span
              key={i}
              style={{
                background: '#F4F1EA',
                color: C.grey,
                fontSize: 12.5,
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: 8,
              }}
            >
              {c}
            </span>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <span
            style={{
              fontSize: 12.5,
              color: C.grey,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {hub}
            {hubCity ? ` · ${hubCity}` : ''}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCompare(v.id);
            }}
            title={`Compare up to ${COMPARE_MAX}`}
            style={{
              zIndex: 2,
              flex: '0 0 auto',
              fontSize: 11.5,
              fontWeight: 700,
              padding: '5px 10px',
              borderRadius: 999,
              cursor: 'pointer',
              border: `1px solid ${comparing ? C.indigo : C.border}`,
              background: comparing ? C.indigo : '#fff',
              color: comparing ? C.cream : C.indigo,
            }}
          >
            {comparing ? '✓ Compare' : '+ Compare'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: RISK_COLOR[v.riskBand ?? 'MODERATE'],
              flex: '0 0 auto',
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.indigo }}>{reasons(v)}</span>
        </div>
      </div>
    </div>
  );
}
