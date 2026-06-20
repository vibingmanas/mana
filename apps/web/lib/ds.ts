// Mana design tokens — cream / ink-indigo / warm coral. See DESIGN_BRIEF.md.
export const C = {
  indigo: '#1F2747',
  indigo2: '#2a3560',
  cream: '#FAF6EF',
  cream2: '#F4EFE6',
  white: '#FFFFFF',
  text: '#1C1B19',
  grey: '#6B675F',
  border: '#ECE6DA',
  coral: '#EE6352',
  coralDark: '#D84C3C',
  tint: '#ECEEF6', // pale indigo — trust badges
} as const;

export const display = "var(--font-display), 'Schibsted Grotesk', sans-serif";
export const body = "var(--font-body), 'Hanken Grotesk', sans-serif";

export const card: React.CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  padding: 20,
};

export const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  background: C.coral,
  color: '#fff',
  border: 'none',
  borderRadius: 13,
  padding: '13px 20px',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export const btnInk: React.CSSProperties = {
  ...btnPrimary,
  background: C.indigo,
  color: C.cream,
};

export const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  background: C.white,
  color: C.indigo,
  border: `1.5px solid ${C.border}`,
  borderRadius: 12,
  padding: '11px 16px',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

export const input: React.CSSProperties = {
  width: '100%',
  border: `1.5px solid ${C.border}`,
  borderRadius: 12,
  padding: '13px 15px',
  fontSize: 16,
  fontWeight: 600,
  color: C.text,
  outline: 'none',
  background: C.white,
};

export const trustBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: C.tint,
  color: C.indigo,
  fontWeight: 700,
  fontSize: 12.5,
  padding: '4px 11px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};

export const h1: React.CSSProperties = {
  fontFamily: display,
  margin: 0,
  fontSize: 'clamp(24px,3.2vw,34px)',
  fontWeight: 800,
  letterSpacing: '-.025em',
  color: C.indigo,
};

export const eyebrow: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: C.grey,
};

export function inr(n: number | null | undefined): string {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}
