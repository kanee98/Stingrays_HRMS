import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";

export const metadata: Metadata = {
  title: "Super Admin Console",
  description: "Client and service governance console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
