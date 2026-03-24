'use client';

import type { ReactNode } from 'react';

interface SectionCardProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = '',
  contentClassName = '',
}: SectionCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow)] ${className}`.trim()}
    >
      {eyebrow || title || description || actions ? (
        <div className="flex flex-col gap-4 border-b border-[var(--surface-border)] px-6 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">{eyebrow}</p>
            ) : null}
            {title ? <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{title}</h2> : null}
            {description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      ) : null}
      <div className={`px-6 py-6 sm:px-8 ${contentClassName}`.trim()}>{children}</div>
    </section>
  );
}
