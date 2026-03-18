'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--surface-border)] bg-[var(--surface-muted)] px-6 py-10 text-center">
      <div className="mx-auto max-w-xl">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
