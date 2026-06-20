import type { ReactNode } from 'react';
import { Schibsted_Grotesk, Hanken_Grotesk } from 'next/font/google';
import DealerShell from './shell';

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

export default function DealerLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${schibsted.variable} ${hanken.variable}`}>
      <DealerShell>{children}</DealerShell>
    </div>
  );
}
