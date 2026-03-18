'use client';

import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, required = false, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[var(--muted-strong)]">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}
