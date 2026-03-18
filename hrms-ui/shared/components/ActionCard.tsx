'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { actionCardClasses } from '../lib/ui';

interface ActionCardProps {
  title: string;
  description: string;
  href?: string;
  external?: boolean;
  actionLabel?: string;
  icon?: ReactNode;
}

export function ActionCard({
  title,
  description,
  href,
  external = false,
  actionLabel = 'Open',
  icon,
}: ActionCardProps) {
  const content = (
    <>
      {icon ? <div className="mb-4 inline-flex rounded-2xl bg-[var(--primary-muted)] p-3 text-[var(--primary)]">{icon}</div> : null}
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
      {href ? <span className="mt-4 inline-flex text-sm font-semibold text-[var(--primary)]">{actionLabel}</span> : null}
    </>
  );

  if (!href) {
    return <div className={actionCardClasses}>{content}</div>;
  }

  if (external) {
    return (
      <a href={href} className={actionCardClasses}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={actionCardClasses}>
      {content}
    </Link>
  );
}
