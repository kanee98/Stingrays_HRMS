import type { AppSidebarItem } from '@shared/components/AppSidebar';
import { adminPath } from '../lib/routes';

export const sidebarItems: AppSidebarItem[] = [
  {
    href: adminPath('/dashboard'),
    label: 'Dashboard',
    icon: 'M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM13 10h7v10h-7V10ZM4 13h7v7H4v-7Z',
  },
  {
    href: adminPath('/clients'),
    label: 'Tenant Directory',
    icon: 'M4 20h16M6.5 20V6.5L12 4l5.5 2.5V20M9 10h.01M9 13.5h.01M9 17h.01M15 10h.01M15 13.5h.01M15 17h.01',
  },
  {
    href: adminPath('/audit'),
    label: 'Audit Trail',
    icon: 'M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3ZM9.5 12 11 13.5l3.5-4',
  },
];
