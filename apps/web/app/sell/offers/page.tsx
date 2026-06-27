'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '../../components/site-header';
import OtpLogin from '../../components/otp-login';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, display, h1, card, input, btnPrimary, btnInk, btnGhost, inr } from '../../../lib/ds';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

interface Offer {
  id: string;
  dealerName: string;
  dealerTier: string;
  amount: number;
  status: string;
  counterAmount: number | null;
  sellerComment: string | null;
  dealerComment: string | null;
}
interface Request {
  id: string;
  make: string | null;
  model: string | null;
  manufactureYear: number | null;
  estFair: number;
  status: string;
  offers: Offer[];
}

const OSTYLE: Record<string, React.CSSProperties> = {
  OPEN: { background: C.tint, color: C.indigo },
  ACCEPTED: { background: '#E9F0E9', color: '#3B6B45' },
  DECLINED: { background: C.cream2, color: C.grey },
  REJECTED: { background: '#FBE9E6', color: C.coralDark },
  RENEGOTIATE: { background: '#FFF4E5', color: '#9A6B00' },
};

export default function SellerOffers() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [reqs, setReqs] = useState<Request[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);
  const load = async () => setReqs(await api<Request[]>('/sell', { auth: true }));
  useEffect(() => {
    if (authed) load().catch((e) => setError(errMsg(e)));
  }, [authed]);

  async function act(fn: () => Promise<unknown>) {
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

  if (authed === null) return null;
  if (!authed)
    return (
      <div>
        <SiteHeader />
        <OtpLogin
          title="Your sell requests"
          subtitle="Sign in to see dealer offers and negotiate."
          role="BUYER"
          onAuthed={() => setAuthed(true)}
        />
      </div>
    );

  return (
    <div>
      <SiteHeader />
      <main
        style={{
          maxWidth: 820,
          margin: '0 auto',
          padding: 'clamp(20px,3vw,32px) clamp(16px,4vw,40px) 90px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <h1 style={{ ...h1, fontSize: 'clamp(26px,4vw,36px)' }}>Your offers</h1>
          <Link href="/sell" style={{ ...btnGhost, textDecoration: 'none' }}>
            + New sell request
          </Link>
        </div>
        <p style={{ color: C.grey, fontSize: 15, margin: '6px 0 22px' }}>
          Accept the best bid, counter it, or pass — dealers compete for your car.
        </p>
        {error && <p style={{ color: C.coralDark }}>{error}</p>}

        {reqs.length === 0 ? (
          <p style={{ color: C.grey }}>No sell requests yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reqs.map((r) => (
              <div key={r.id} style={{ ...card }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <span
                    style={{ fontFamily: display, fontWeight: 800, fontSize: 17, color: C.text }}
                  >
                    {r.manufactureYear} {r.make} {r.model}
                  </span>
                  <span style={{ color: C.grey, fontSize: 13.5 }}>
                    Est. fair {inr(r.estFair)} · {r.status.toLowerCase().replace('_', ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  {r.offers.length === 0 && (
                    <p style={{ color: C.grey, fontSize: 14, margin: 0 }}>
                      Offers appear after you book the free inspection.
                    </p>
                  )}
                  {r.offers.map((o) => (
                    <OfferRow
                      key={o.id}
                      reqId={r.id}
                      offer={o}
                      accepted={r.status === 'ACCEPTED'}
                      busy={busy}
                      act={act}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OfferRow({
  reqId,
  offer,
  accepted,
  busy,
  act,
}: {
  reqId: string;
  offer: Offer;
  accepted: boolean;
  busy: boolean;
  act: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [open, setOpen] = useState<'none' | 'counter' | 'reject'>('none');
  const [counter, setCounter] = useState('');
  const [comment, setComment] = useState('');
  const canAct = !accepted && (offer.status === 'OPEN' || offer.status === 'RENEGOTIATE');

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 18, color: C.indigo }}>
            {inr(offer.amount)}
          </span>
          <span style={{ color: C.grey, fontSize: 13 }}>
            {' '}
            · {offer.dealerName} ({offer.dealerTier})
          </span>
        </div>
        <span
          style={{
            ...(OSTYLE[offer.status] ?? OSTYLE.OPEN),
            fontSize: 11.5,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          {offer.status.toLowerCase()}
        </span>
      </div>
      {offer.dealerComment && (
        <p style={{ margin: '8px 0 0', color: C.grey, fontSize: 13 }}>“{offer.dealerComment}”</p>
      )}

      {canAct && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            style={btnInk}
            disabled={busy}
            onClick={() =>
              act(() =>
                api(`/sell/${reqId}/offers/${offer.id}/accept`, { method: 'POST', auth: true }),
              )
            }
          >
            Accept
          </button>
          <button
            style={btnGhost}
            disabled={busy}
            onClick={() => setOpen(open === 'counter' ? 'none' : 'counter')}
          >
            Counter
          </button>
          <button
            style={btnGhost}
            disabled={busy}
            onClick={() => setOpen(open === 'reject' ? 'none' : 'reject')}
          >
            Reject
          </button>
        </div>
      )}

      {open === 'counter' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input
            value={counter}
            onChange={(e) => setCounter(e.target.value)}
            placeholder={`Counter (> ${offer.amount})`}
            style={{ ...input, flex: '1 1 140px' }}
          />
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comment (optional)"
            style={{ ...input, flex: '1 1 160px' }}
          />
          <button
            style={btnPrimary}
            disabled={busy || Number(counter) <= offer.amount}
            onClick={() =>
              act(() =>
                api(`/sell/${reqId}/offers/${offer.id}/renegotiate`, {
                  method: 'POST',
                  body: { counterAmount: Number(counter), comment: comment || undefined },
                  auth: true,
                }),
              ).then(() => setOpen('none'))
            }
          >
            Send counter
          </button>
        </div>
      )}
      {open === 'reject' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Reason (optional)"
            style={{ ...input, flex: '1 1 200px' }}
          />
          <button
            style={btnPrimary}
            disabled={busy}
            onClick={() =>
              act(() =>
                api(`/sell/${reqId}/offers/${offer.id}/reject`, {
                  method: 'POST',
                  body: { comment: comment || undefined },
                  auth: true,
                }),
              ).then(() => setOpen('none'))
            }
          >
            Confirm reject
          </button>
        </div>
      )}
    </div>
  );
}
