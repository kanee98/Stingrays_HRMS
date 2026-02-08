'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface AppSidebarItem {
  href: string;
  label: string;
  icon: string;
}

export interface AppSidebarProps {
  items: AppSidebarItem[];
}

/**
 * Shared sidebar used by all microservices.
 * Each app passes its own nav items; styling and behaviour are uniform.
 */
export function AppSidebar({ items }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
              }`}
            >
              <svg
                className="w-5 h-5 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={item.icon}
                />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
