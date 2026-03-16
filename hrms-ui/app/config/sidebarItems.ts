import type { AppSidebarItem } from '@shared/components/AppSidebar';
import type { ClientAccessSnapshot } from '@shared/services/clientAccess';
import { isSectionEnabled, isServiceEnabled } from '@shared/services/clientAccess';
import { getEmployeeUrl } from '@shared/lib/appUrls';

type HrmsSidebarConfig = AppSidebarItem & {
  sectionKey?: string;
  linkedServiceKey?: string;
};

const hrmsSidebarConfig: HrmsSidebarConfig[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', sectionKey: 'dashboard' },
  { href: '/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', sectionKey: 'users' },
  { href: '/payroll', label: 'Payroll', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', sectionKey: 'payroll' },
  { href: '/leave', label: 'Leave Management', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', sectionKey: 'leave-management' },
  { href: '/attendance', label: 'Attendance', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', sectionKey: 'attendance' },
  { href: '/recruitment', label: 'Recruitment', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', sectionKey: 'recruitment' },
  { href: '/performance', label: 'Performance', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', sectionKey: 'performance' },
  { href: '/reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', sectionKey: 'reports' },
  { href: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', sectionKey: 'settings' },
  { href: getEmployeeUrl(), label: 'Employee Onboarding', icon: 'M12 4v16m8-8H4', linkedServiceKey: 'employee-onboarding' },
];

export function getHrmsSidebarItems(access?: ClientAccessSnapshot | null): AppSidebarItem[] {
  return hrmsSidebarConfig.filter((item) => {
    if (item.linkedServiceKey) {
      return isServiceEnabled(access, item.linkedServiceKey);
    }

    return isSectionEnabled(access, 'hrms', item.sectionKey);
  });
}

export function getHrmsSectionFromPath(pathname: string): string | null {
  const normalizedPath = pathname === '/' ? '/dashboard' : pathname;
  const directMatch = hrmsSidebarConfig.find((item) => item.sectionKey && normalizedPath === item.href);

  if (directMatch?.sectionKey) {
    return directMatch.sectionKey;
  }

  const nestedMatch = hrmsSidebarConfig.find(
    (item) => item.sectionKey && item.href !== '/dashboard' && normalizedPath.startsWith(`${item.href}/`),
  );

  return nestedMatch?.sectionKey ?? null;
}
