'use client';

export const primaryActionClasses =
  'inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30';

export const secondaryActionClasses =
  'inline-flex items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--muted-strong)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20';

export const destructiveActionClasses =
  'inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30';

export const inlineActionClasses =
  'text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50';
