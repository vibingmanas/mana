'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, type ApiError } from '../../../lib/api';
import { C, display, h1, card, input, btnPrimary, btnInk, btnGhost, inr } from '../../../lib/ds';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

interface Drawdown {
  id: string;
  vehicleId: string;
  principal: number;
  interestAccrued: number;
  status: string;
  drawnAt: string;
}
interface Facility {
  lender: string;
  creditLimit: number;
  outstanding: number;
  available: number;
  interestApr: number;
  status: string;
  drawdowns: Drawdown[];
}
interface Vehicle {
  id: string;
  regNumber: string;
  make: string | null;
  model: string | null;
}

export default function DealerFinancing() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [cars, setCars] = useState<Vehicle[]>([]);
  const [reqLimit, setReqLimit] = useState('1000000');
  const [vehicleId, setVehicleId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setAuthed(!!getToken()), []);
  const load = async () => {
    const [f, v] = await Promise.all([
      api<Facility | null>('/dealer/floor-plan', { auth: true }),
      api<Vehicle[]>('/vehicles', { auth: true }),
    ]);
    setFacility(f);
    setCars(v);
    setLoaded(true);
  };
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
      <h1 style={h1}>Floor-plan financing</h1>
      <p style={{ margin: '5px 0 18px', color: C.grey, fontSize: 14.5 }}>
        A lender funds your stock up to a limit. Draw down per car, repay on sale.
      </p>
      {error && <p style={{ color: C.coralDark }}>{error}</p>}

      {loaded && !facility ? (
        <div style={{ ...card }}>
          <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, margin: '0 0 8px' }}>
            Request a facility
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={reqLimit}
              onChange={(e) => setReqLimit(e.target.value)}
              placeholder="Requested limit ₹"
              style={{ ...input, flex: '1 1 200px' }}
            />
            <button
              style={btnPrimary}
              disabled={busy || Number(reqLimit) < 50000}
              onClick={() =>
                run(() =>
                  api('/dealer/floor-plan/request', {
                    method: 'POST',
                    body: { requestedLimit: Number(reqLimit) },
                    auth: true,
                  }),
                )
              }
            >
              Request
            </button>
          </div>
        </div>
      ) : facility ? (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <Stat label="Credit limit" value={inr(facility.creditLimit)} />
            <Stat label="Available" value={inr(facility.available)} />
            <Stat label="Outstanding" value={inr(facility.outstanding)} />
            <Stat label="Rate" value={`${facility.interestApr}% APR`} />
          </div>
          <p style={{ color: C.grey, fontSize: 13.5, marginTop: -8, marginBottom: 18 }}>
            {facility.lender} · {facility.status.toLowerCase()}
          </p>

          <div style={{ ...card, marginBottom: 22 }}>
            <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, margin: '0 0 10px' }}>
              New drawdown
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                style={{ ...input, flex: '1 1 200px' }}
              >
                <option value="">Select a car…</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.make ? `${c.make} ${c.model ?? ''}` : c.regNumber} ({c.regNumber})
                  </option>
                ))}
              </select>
              <input
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="Amount ₹"
                style={{ ...input, flex: '0 0 150px' }}
              />
              <button
                style={btnInk}
                disabled={busy || !vehicleId || Number(principal) < 10000}
                onClick={() =>
                  run(() =>
                    api('/dealer/floor-plan/drawdown', {
                      method: 'POST',
                      body: { vehicleId, principal: Number(principal) },
                      auth: true,
                    }).then(() => {
                      setVehicleId('');
                      setPrincipal('');
                    }),
                  )
                }
              >
                Draw down
              </button>
            </div>
          </div>

          <h2 style={{ fontFamily: display, fontSize: 18, color: C.indigo, marginBottom: 12 }}>
            Drawdowns
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {facility.drawdowns.map((d) => {
              const car = cars.find((c) => c.id === d.vehicleId);
              return (
                <div
                  key={d.id}
                  style={{
                    ...card,
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong style={{ fontFamily: display, color: C.text }}>
                      {inr(d.principal)}
                    </strong>
                    <span style={{ color: C.grey, fontSize: 13 }}>
                      {' '}
                      · {car ? `${car.make ?? car.regNumber}` : d.vehicleId.slice(0, 8)} ·{' '}
                      {d.status.toLowerCase()}
                      {d.interestAccrued ? ` · interest ${inr(d.interestAccrued)}` : ''}
                    </span>
                  </div>
                  {d.status === 'OUTSTANDING' && (
                    <button
                      style={{ ...btnGhost, padding: '6px 12px' }}
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          api(`/dealer/floor-plan/drawdowns/${d.id}/repay`, {
                            method: 'POST',
                            auth: true,
                          }),
                        )
                      }
                    >
                      Repay
                    </button>
                  )}
                </div>
              );
            })}
            {facility.drawdowns.length === 0 && <p style={{ color: C.grey }}>No drawdowns yet.</p>}
          </div>
        </>
      ) : (
        <p style={{ color: C.grey }}>Loading…</p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...card, minWidth: 130, padding: '16px 20px' }}>
      <div style={{ fontFamily: display, fontSize: 22, fontWeight: 800, color: C.indigo }}>
        {value}
      </div>
      <div style={{ color: C.grey, fontSize: 13 }}>{label}</div>
    </div>
  );
}
