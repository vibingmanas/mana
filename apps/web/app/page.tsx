async function getApiHealth(): Promise<{ status: string; db: string } | null> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as { status: string; db: string };
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getApiHealth();

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Mana</h1>
      <p style={{ color: 'var(--muted)', fontSize: '1.15rem' }}>
        Trusted used cars from your local dealers — verified, inspected, financed.
      </p>

      <section
        style={{
          marginTop: '2.5rem',
          padding: '1.25rem 1.5rem',
          background: 'var(--card)',
          borderRadius: 12,
        }}
      >
        <strong>System status</strong>
        <ul style={{ marginTop: '0.75rem', color: 'var(--muted)' }}>
          <li>Web: up</li>
          <li>API: {health ? health.status : 'unreachable'}</li>
          <li>DB: {health ? health.db : 'unknown'}</li>
        </ul>
      </section>

      <p style={{ marginTop: '2rem', color: 'var(--muted)' }}>
        Scaffold ready. See <code>/plans</code> and <code>PROJECT_REPORT.md</code> for the roadmap.
      </p>
    </main>
  );
}
