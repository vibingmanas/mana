import type { ReactNode } from 'react';
import DealerShell from './shell';

export default function DealerLayout({ children }: { children: ReactNode }) {
  return <DealerShell>{children}</DealerShell>;
}
