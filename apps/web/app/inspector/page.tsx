'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getToken, clearTokens, type ApiError } from '../../lib/api';
import { C, display, h1, card, btnPrimary, btnInk, btnGhost, input } from '../../lib/ds';
import OtpLogin from '../components/otp-login';

const errMsg = (e: unknown) => (e as ApiError)?.message ?? 'Something went wrong';

const SECTIONS: [string, string][] = [
  ['engine', 'Engine'],
  ['transmission', 'Transmission'],
  ['electrical', 'Electricals'],
  ['suspensionBrakes', 'Suspension & brakes'],
  ['structureBody', 'Structure & body'],
  ['interior', 'Interior'],
  ['tyres', 'Tyres'],
  ['ac', 'Air-con'],
];

interface Job {
  id: string;
  status: 'REQUESTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: string | null;
  location: string | null;
  inspectionId: string | null;
  vehicle: {
    id: string;
    regNumber: string;
    make: string | null;
    model: string | null;
    manufactureYear: number | null;
  } | null;
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  ASSIGNED: { background: C.cream2, color: C.grey },
  IN_PROGRESS: { background: C.tint, color: C.indigo },
  COMPLETED: { background: '#E9F0E9', color: '#3B6B45' },
};

export default function InspectorApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setAuthed(!!getToken()), []);
  const load = async () => setJobs(await api<Job[]>('/inspections/jobs', { auth: true }));
  useEffect(() => {
    if (authed) load().catch((e) => setError(errMsg(e)));
  }, [authed]);

  if (authed === null) return null;
  if (!authed)
    return (
      <OtpLogin
        title="Inspector sign-in"
        subtitle="Sign in to see your assigned inspections."
        defaultPhone="+919000000003"
        onAuthed={() => setAuthed(true)}
      />
    );

  const open = jobs.filter((j) => j.status !== 'COMPLETED' && j.status !== 'CANCELLED');
  const done = jobs.filter((j) => j.status === 'COMPLETED');

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(16px,3vw,28px)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
        >
          <span
            style={{
              width: 33,
              height: 33,
              borderRadius: 10,
              background: C.indigo,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.cream,
              fontFamily: display,
              fontWeight: 800,
              fontSize: 19,
            }}
          >
            m
          </span>
          <span style={{ fontFamily: display, fontWeight: 800, fontSize: 18, color: C.indigo }}>
            Inspector
          </span>
        </Link>
        <button
          style={{ ...btnGhost, padding: '8px 14px' }}
          onClick={() => {
            clearTokens();
            setAuthed(false);
          }}
        >
          Sign out
        </button>
      </header>

      <h1 style={h1}>Your inspections</h1>
      <p style={{ margin: '5px 0 18px', color: C.grey, fontSize: 14.5 }}>
        {open.length} to do · {done.length} completed
      </p>
      {error && <p style={{ color: C.coralDark }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {open.map((j) => (
          <JobCard key={j.id} job={j} onChange={() => load().catch((e) => setError(errMsg(e)))} />
        ))}
        {open.length === 0 && (
          <p style={{ color: C.grey }}>Nothing assigned right now. Check back later.</p>
        )}
      </div>

      {done.length > 0 && (
        <>
          <h2 style={{ ...h1, fontSize: 20, marginTop: 30 }}>Completed</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {done.map((j) => (
              <div key={j.id} style={{ ...card, padding: 14 }}>
                <span style={{ fontFamily: display, fontWeight: 800, color: C.text }}>
                  {j.vehicle?.make} {j.vehicle?.model}
                </span>
                <span style={{ color: C.grey, fontSize: 13 }}>
                  {' '}
                  · {j.vehicle?.regNumber} · submitted
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function JobCard({ job, onChange }: { job: Job; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(SECTIONS.map(([k]) => [k, '85'])),
  );
  const [odo, setOdo] = useState('');
  const [notes, setNotes] = useState('');

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const start = () =>
    run(async () => {
      await api(`/inspections/jobs/${job.id}/start`, { method: 'POST', auth: true });
      onChange();
    });

  const submit = () =>
    run(async () => {
      const sectionScores = Object.fromEntries(
        SECTIONS.map(([k]) => [k, Math.max(0, Math.min(100, Number(scores[k]) || 0))]),
      );
      const r = await api<{ inspection: { grade: string; overallScore: number } }>(
        `/inspections/jobs/${job.id}/submit`,
        {
          method: 'POST',
          auth: true,
          body: {
            sectionScores,
            odometerKm: odo ? Number(odo) : undefined,
            notes: notes || undefined,
            clientRef: `${job.id}-${Date.now()}`,
          },
        },
      );
      setResult(`Submitted — grade ${r.inspection.grade} (${r.inspection.overallScore}/100)`);
      onChange();
    });

  return (
    <div style={{ ...card }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: display, fontWeight: 800, fontSize: 17, color: C.text }}>
          {job.vehicle?.manufactureYear} {job.vehicle?.make} {job.vehicle?.model}
        </span>
        <span
          style={{
            ...(STATUS_STYLE[job.status] ?? STATUS_STYLE.ASSIGNED),
            fontSize: 11.5,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
          }}
        >
          {job.status.replace('_', ' ').toLowerCase()}
        </span>
      </div>
      <div style={{ fontSize: 13, color: C.grey, marginTop: 4 }}>
        {job.vehicle?.regNumber}
        {job.location ? ` · ${job.location}` : ''}
        {job.scheduledAt ? ` · ${new Date(job.scheduledAt).toLocaleDateString('en-IN')}` : ''}
      </div>

      {result ? (
        <p style={{ color: C.indigo, fontWeight: 700, fontSize: 14, marginTop: 14 }}>{result}</p>
      ) : job.status === 'ASSIGNED' ? (
        <button style={{ ...btnInk, marginTop: 14 }} disabled={busy} onClick={start}>
          Start inspection
        </button>
      ) : job.status === 'IN_PROGRESS' ? (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
              gap: 10,
            }}
          >
            {SECTIONS.map(([k, label]) => (
              <label key={k} style={{ fontSize: 13 }}>
                <span style={{ color: C.grey, fontWeight: 600 }}>{label}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={scores[k]}
                  onChange={(e) => setScores((s) => ({ ...s, [k]: e.target.value }))}
                  style={{ ...input, marginTop: 4, padding: '10px 12px' }}
                />
              </label>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <input
              value={odo}
              onChange={(e) => setOdo(e.target.value)}
              placeholder="Odometer (km)"
              style={input}
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              style={input}
            />
          </div>
          <button
            style={{ ...btnPrimary, width: '100%', marginTop: 14, padding: 14, fontSize: 15 }}
            disabled={busy}
            onClick={submit}
          >
            {busy ? 'Submitting…' : 'Submit inspection'}
          </button>
        </div>
      ) : null}
      {error && <p style={{ color: C.coralDark, fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  );
}
