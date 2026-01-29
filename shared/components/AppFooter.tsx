'use client';

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-auto border-t border-gray-200 bg-white py-4"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-600">
          © {year} Stingrays Global Intellectual Property. All rights reserved.
          {' · '}
          Designed and built by{' '}
          <a
            href="https://fusionlabz.lk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 font-medium transition"
          >
            FusionLabz.lk
          </a>
        </p>
      </div>
    </footer>
  );
}
