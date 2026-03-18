'use client';

import type { ReactNode } from 'react';

type MetricTone = 'primary' | 'success' | 'warning' | 'info' | 'neutral';

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
  tone?: MetricTone;
}

const toneClasses: Record<MetricTone, string> = {
  primary: 'bg-[var(--primary-muted)] text-[var(--primary)]',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  neutral: 'bg-[var(--surface-muted)] text-[var(--muted-strong)]',
};

export function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = 'primary',
}: MetricCardProps) {
  return (
    <div className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
          {helper ? <p className="mt-2 text-sm text-[var(--muted)]">{helper}</p> : null}
        </div>
        {icon ? (
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}>
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
