'use client';

type NoticeTone = 'error' | 'success' | 'info' | 'warning';

interface NoticeBannerProps {
  tone?: NoticeTone;
  message: string;
}

const toneClasses: Record<NoticeTone, string> = {
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
};

export function NoticeBanner({ tone = 'info', message }: NoticeBannerProps) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone]}`}>{message}</div>;
}
