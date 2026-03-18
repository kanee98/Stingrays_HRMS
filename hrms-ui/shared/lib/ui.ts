export const pageStackClasses = 'space-y-6';

const baseButtonClasses =
  'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';

export const primaryButtonClasses =
  `${baseButtonClasses} bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] focus:ring-[var(--primary)]/30`;

export const secondaryButtonClasses =
  `${baseButtonClasses} border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[var(--primary)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus:ring-[var(--primary)]/20`;

export const ghostButtonClasses =
  `${baseButtonClasses} bg-transparent text-[var(--muted-strong)] hover:bg-[var(--primary-muted)] hover:text-[var(--primary)] focus:ring-[var(--primary)]/15`;

export const destructiveButtonClasses =
  `${baseButtonClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/30`;

export const buttonVariantClasses = {
  primary: primaryButtonClasses,
  secondary: secondaryButtonClasses,
  ghost: ghostButtonClasses,
  destructive: destructiveButtonClasses,
} as const;

export const primaryActionClasses = primaryButtonClasses;
export const secondaryActionClasses = secondaryButtonClasses;
export const destructiveActionClasses = destructiveButtonClasses;

export const inlineActionClasses =
  'text-sm font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50';

export const actionCardClasses =
  'rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-5 py-4 transition hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]';

export const inputClasses =
  'w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20';

export const selectClasses = inputClasses;

export const textareaClasses =
  'w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20';

export const checkboxClasses =
  'h-4 w-4 rounded border-[var(--surface-border)] text-[var(--primary)] focus:ring-[var(--primary)]';

export const tableHeaderRowClasses = 'border-b border-[var(--surface-border)] text-[var(--muted)]';

export const tableBodyRowClasses = 'border-b border-[var(--surface-border)]/70 align-top';

export const mutedPlaceholder = 'Not provided';