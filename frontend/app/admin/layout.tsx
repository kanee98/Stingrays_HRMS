import { AuthProvider } from '@admin/app/contexts/AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
