import { AuthProvider } from '@portal/app/contexts/AuthContext';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
