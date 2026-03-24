import { AuthProvider } from '@employee/app/contexts/AuthContext';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
