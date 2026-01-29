import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { ConditionalFooter } from "./components/ConditionalFooter";

export const metadata: Metadata = {
  title: "HRMS Dashboard",
  description: "Human Resource Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="min-h-screen flex flex-col"
        style={{
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        <AuthProvider>
          <div className="min-h-screen flex flex-col flex-1">
            <div className="flex-1">{children}</div>
            <ConditionalFooter />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}