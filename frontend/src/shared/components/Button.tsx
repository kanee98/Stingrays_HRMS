'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonVariantClasses } from '../lib/ui';

type ButtonVariant = keyof typeof buttonVariantClasses;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`${buttonVariantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}