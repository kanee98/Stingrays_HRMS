'use client';

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-auto border-t border-[var(--surface-border)] bg-[var(--surface)] py-4"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-[var(--muted)]">
          © {year} Stingrays Global Intellectual Property. All rights reserved
          {' · '}
          Designed and built by{' '}
          <a
            href="https://fusionlabz.lk"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--primary)] transition hover:text-[var(--primary-hover)]"
          >
            FusionLabz.lk
          </a>
        </p>
      </div>
    </footer>
  );
}
