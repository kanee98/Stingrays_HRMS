'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { MetricCard } from '@shared/components/MetricCard';
import { PageHeader } from '@shared/components/PageHeader';
import { SectionCard } from '@shared/components/SectionCard';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { primaryButtonClasses, secondaryButtonClasses } from '@shared/lib/ui';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';

const API_URL = getEmployeeApiUrl();

interface EmployeeRecord {
  Id: number;
  FirstName: string | null;
  LastName: string | null;
  Email: string | null;
  Position: string | null;
  Department: string | null;
  OnboardingStatus: string | null;
  OnboardingCompletedAt: string | null;
  CompletedItems: number;
  TotalItems: number;
  CreatedAt: string | null;
}

function getDisplayName(employee: EmployeeRecord): string {
  const name = [employee.FirstName, employee.LastName].filter(Boolean).join(' ').trim();
  return name || `Employee #${employee.Id}`;
}

function getStatusLabel(employee: EmployeeRecord): string {
  return employee.OnboardingStatus === 'completed' ? 'Completed' : 'In progress';
}

function getProgressLabel(employee: EmployeeRecord): string {
  return `${employee.CompletedItems ?? 0} / ${employee.TotalItems ?? 0} checklist items`;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_URL}/api/employees`);
        if (!response.ok) {
          throw new Error('Failed to load employees');
        }
        const data = await response.json();
        if (!cancelled) {
          setEmployees(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load employees');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const total = employees.length;
    const completed = employees.filter((employee) => employee.OnboardingStatus === 'completed').length;
    const inProgress = total - completed;
    return { total, completed, inProgress };
  }, [employees]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Employees"
            title="Onboarded employees"
            description="View employee records created through onboarding and continue any onboarding flow that is still in progress."
            actions={<Link href="/onboarding" className={primaryButtonClasses}>Start onboarding</Link>}
          />

          {error ? <NoticeBanner tone="error" message={error} /> : null}

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Employees" value={String(metrics.total)} helper="Records created in onboarding" tone="primary" />
            <MetricCard label="Completed" value={String(metrics.completed)} helper="Onboarding flows with contracts generated" tone="success" />
            <MetricCard label="In progress" value={String(metrics.inProgress)} helper="Employees still moving through onboarding" tone="warning" />
          </div>

          <SectionCard
            eyebrow="Directory"
            title="Employee records"
            description="Open an employee to continue onboarding, review readiness, or generate the contract."
          >
            {loading ? (
              <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
                Loading employees...
              </div>
            ) : employees.length === 0 ? (
              <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center">
                <p className="text-sm text-[var(--muted)]">No employees have been created through onboarding yet.</p>
                <div className="mt-4">
                  <Link href="/onboarding" className={secondaryButtonClasses}>Create first employee</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {employees.map((employee) => {
                  const progressTotal = employee.TotalItems || 0;
                  const progressCompleted = employee.CompletedItems || 0;
                  const progressPercent = progressTotal === 0 ? 0 : Math.round((progressCompleted / progressTotal) * 100);

                  return (
                    <div
                      key={employee.Id}
                      className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div>
                            <p className="text-lg font-semibold text-[var(--foreground)]">{getDisplayName(employee)}</p>
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {employee.Email || 'No email provided'}
                            </p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Position</p>
                              <p className="mt-1 text-sm text-[var(--foreground)]">{employee.Position || 'Not set'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Department</p>
                              <p className="mt-1 text-sm text-[var(--foreground)]">{employee.Department || 'Not set'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Status</p>
                              <p className="mt-1 text-sm text-[var(--foreground)]">{getStatusLabel(employee)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Checklist</p>
                              <p className="mt-1 text-sm text-[var(--foreground)]">{getProgressLabel(employee)}</p>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-sm text-[var(--muted)]">
                              <span>Progress</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-border)]">
                              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${progressPercent}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <Link href={`/onboarding?employeeId=${employee.Id}`} className={secondaryButtonClasses}>
                            {employee.OnboardingStatus === 'completed' ? 'View record' : 'Continue onboarding'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
