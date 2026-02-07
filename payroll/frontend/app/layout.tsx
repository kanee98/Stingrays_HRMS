import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { PayrollLayout } from "./components/PayrollLayout";

export const metadata: Metadata = {
  title: "Payroll",
  description: "Payroll microservice",
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
            <PayrollLayout>{children}</PayrollLayout>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
