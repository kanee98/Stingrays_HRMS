import { AuthProvider } from '@payroll/app/contexts/AuthContext';
import { PayrollLayout } from '@payroll/app/components/PayrollLayout';

export default function PayrollLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PayrollLayout>{children}</PayrollLayout>
    </AuthProvider>
  );
}
