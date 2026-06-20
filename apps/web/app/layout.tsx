import type { Metadata } from 'next';
import { Schibsted_Grotesk, Hanken_Grotesk } from 'next/font/google';
import './globals.css';

const schibsted = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
});
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Mana — Every car inspected. Every price honest.',
  description:
    'Buy a used car the calm way — verified condition, one transparent on-road price, and a 7-day return window. India’s most trusted used cars.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${schibsted.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
