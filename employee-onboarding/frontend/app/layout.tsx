import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "@shared/components/ThemeProvider";
import { ThemeScript } from "@shared/components/ThemeScript";

export const metadata: Metadata = {
  title: "Employee Onboarding",
  description: "Employee Onboarding System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen flex flex-col"
        style={{
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        <ThemeScript />
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col flex-1">
              {children}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
