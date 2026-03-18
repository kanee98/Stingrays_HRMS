'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">{eyebrow}</p>
          ) : null}
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">{description}</p>
          ) : null}
          {meta ? <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3 xl:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}
