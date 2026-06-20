import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mana — Trusted used cars from local dealers',
  description:
    "India's used-car platform that organizes the unorganized dealer market with verification, inspection, and trust.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
