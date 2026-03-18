'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--surface-border)] rounded-[var(--radius)] shadow-[var(--shadow)] ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
