import type { Metadata } from 'next';
import { ThemeProvider } from '@shared/components/ThemeProvider';
import { ThemeScript } from '@shared/components/ThemeScript';
import './globals.css';
import { AuthProvider } from './contexts/AuthContext';

export const metadata: Metadata = {
  title: 'FusionLabz Platform Administration',
  description: 'Tenant governance, product rollout, and audit oversight for FusionLabz platform operators',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
