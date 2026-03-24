'use client';

import { useEffect, type ReactNode } from 'react';

interface ModalShellProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
}

export function ModalShell({
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName = 'max-w-2xl',
}: ModalShellProps) {
  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const previousHtmlOverflow = documentElement.style.overflow;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div className="relative z-10 flex h-full items-start justify-center py-2 sm:items-center sm:py-6">
        <div className={`flex max-h-full w-full ${maxWidthClassName} flex-col overflow-hidden rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:max-h-[calc(100dvh-3rem)]`}>
          <div className="flex items-start justify-between gap-4 border-b border-[var(--surface-border)] px-5 py-5 sm:px-8">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">{title}</h2>
              {description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--muted-strong)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">{children}</div>
          {footer ? (
            <div className="border-t border-[var(--surface-border)] bg-[var(--surface)] px-5 py-4 sm:px-8">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
