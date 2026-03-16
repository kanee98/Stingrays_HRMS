import type { AppSidebarItem } from '@shared/components/AppSidebar';
import type { ClientAccessSnapshot } from '@shared/services/clientAccess';
import { isSectionEnabled } from '@shared/services/clientAccess';

type PayrollSidebarConfig = AppSidebarItem & {
  sectionKey: string;
};

const payrollSidebarConfig: PayrollSidebarConfig[] = [
  { href: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', sectionKey: 'dashboard' },
  { href: '/payruns', label: 'Pay runs', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', sectionKey: 'payruns' },
  { href: '/config', label: 'Config (tax & deductions)', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', sectionKey: 'config' },
  { href: '/reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', sectionKey: 'reports' },
];

export function getPayrollSidebarItems(access?: ClientAccessSnapshot | null): AppSidebarItem[] {
  return payrollSidebarConfig.filter((item) => isSectionEnabled(access, 'payroll', item.sectionKey));
}

export function getPayrollSectionFromPath(pathname: string): string | null {
  const normalizedPath = pathname === '/' ? '/' : pathname;
  const directMatch = payrollSidebarConfig.find((item) => normalizedPath === item.href);
  if (directMatch) {
    return directMatch.sectionKey;
  }

  const nestedMatch = payrollSidebarConfig.find(
    (item) => item.href !== '/' && normalizedPath.startsWith(`${item.href}/`),
  );

  return nestedMatch?.sectionKey ?? null;
}
