'use client';

import { usePathname } from 'next/navigation';
import { AppFooter } from '@shared/components/AppFooter';

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return <AppFooter />;
}
