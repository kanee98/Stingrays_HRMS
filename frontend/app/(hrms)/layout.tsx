import { AuthProvider } from '@hrms/app/contexts/AuthContext';

export default function HrmsLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
