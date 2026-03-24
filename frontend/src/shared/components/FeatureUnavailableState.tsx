'use client';

import Link from 'next/link';

interface FeatureUnavailableStateProps {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}

export function FeatureUnavailableState({
  title,
  description,
  actionHref,
  actionLabel,
}: FeatureUnavailableStateProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="max-w-lg rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-lg)]">
        <span className="inline-flex rounded-full bg-[var(--primary-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Access Restricted
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
        <Link
          href={actionHref}
          className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)]"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
