'use client';

import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const nextLabel = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      aria-pressed={isDarkMode}
      className={`inline-flex items-center gap-3 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] ${className}`}
    >
      <span
        className={`relative flex h-6 w-11 items-center rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] transition ${
          isDarkMode ? 'justify-end' : 'justify-start'
        }`}
      >
        <span className="mx-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-sm transition">
          {isDarkMode ? (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9 9 0 1012 21a8.96 8.96 0 008.354-5.646z"
              />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v2.25m0 13.5V21m9-9h-2.25M5.25 12H3m14.364 6.364l-1.591-1.591M8.227 8.227 6.636 6.636m10.728 0-1.591 1.591M8.227 15.773l-1.591 1.591M15.75 12A3.75 3.75 0 1112 8.25 3.75 3.75 0 0115.75 12z"
              />
            </svg>
          )}
        </span>
      </span>
      <span className="hidden sm:inline">{isDarkMode ? 'Dark mode' : 'Light mode'}</span>
    </button>
  );
}
