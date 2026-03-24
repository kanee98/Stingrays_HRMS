import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@shared/components/ThemeProvider';
import { ThemeScript } from '@shared/components/ThemeScript';

export const metadata: Metadata = {
  title: 'Stingrays Workspace',
  description: 'Unified workforce operations platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <ThemeScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
