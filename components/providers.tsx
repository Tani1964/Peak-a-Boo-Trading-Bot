'use client';

import { TimezoneProvider } from '@/lib/timezone';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <TimezoneProvider>{children}</TimezoneProvider>;
}

