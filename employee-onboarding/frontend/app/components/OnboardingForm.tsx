'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { SectionCard } from '@shared/components/SectionCard';
import { Stepper } from '@shared/components/Stepper';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { PersonalInfoStep } from './steps/PersonalInfoStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { PoliceReportStep } from './steps/PoliceReportStep';
import { ReviewStep } from './steps/ReviewStep';

const API_URL = getEmployeeApiUrl();

type StepId = 'personal' | 'documents' | 'police' | 'review';

interface EmployeeData {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
  nic: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  position: string;
  department: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

function hasValue(value: unknown): boolean {
  return value != null && String(value).trim() !== '';
}

function isPersonalInfoComplete(data: EmployeeData): boolean {
  return [
    data.firstName,
    data.lastName,
    data.email,
    data.dob,
    data.nic,
    data.phone,
    data.address,
    data.city,
    data.postalCode,
    data.position,
    data.department,
    data.emergencyContactName,
    data.emergencyContactPhone,
  ].every(hasValue);
}

export function OnboardingForm() {
  const searchParams = useSearchParams();
  const existingEmployeeId = searchParams.get('employeeId');
  const [currentStep, setCurrentStep] = useState(1);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!existingEmployeeId);
  const [onboardingSettings, setOnboardingSettings] = useState<{
    showPoliceReportStep: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [employeeData, setEmployeeData] = useState<EmployeeData>({
    firstName: '',
    lastName: '',
    email: '',
    dob: '',
    nic: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    position: '',
    department: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/onboarding`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setOnboardingSettings({
            showPoliceReportStep: data.showPoliceReportStep !== false,
          });
        }
      } catch {
        if (!cancelled) setOnboardingSettings({ showPoliceReportStep: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!existingEmployeeId) return;
    const id = parseInt(existingEmployeeId, 10);
    if (Number.isNaN(id)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/employees/${id}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const e = data as Record<string, unknown>;
        const empId = e.Id ?? e.id;
        const nextEmployeeData: EmployeeData = {
          firstName: String(e.FirstName ?? e.firstName ?? ''),
          lastName: String(e.LastName ?? e.lastName ?? ''),
          email: String(e.Email ?? e.email ?? ''),
          dob: (e.DOB ?? e.dob) ? String(e.DOB ?? e.dob).split('T')[0] : '',
          nic: String(e.NIC ?? e.nic ?? ''),
          phone: String(e.Phone ?? e.phone ?? ''),
          address: String(e.Address ?? e.address ?? ''),
          city: String(e.City ?? e.city ?? ''),
          postalCode: String(e.PostalCode ?? e.postalCode ?? ''),
          position: String(e.Position ?? e.position ?? ''),
          department: String(e.Department ?? e.department ?? ''),
          emergencyContactName: String(e.EmergencyContactName ?? e.emergencyContactName ?? ''),
          emergencyContactPhone: String(e.EmergencyContactPhone ?? e.emergencyContactPhone ?? ''),
        };
        const checklist = Array.isArray((data as { checklist?: unknown[] }).checklist)
          ? ((data as { checklist?: Array<{ ItemName?: string; IsCompleted?: boolean | number }> }).checklist ?? [])
          : [];
        const personalInfoItem = checklist.find((item) => item?.ItemName === 'Personal Information');
        const personalInfoReady = personalInfoItem
          ? Boolean(personalInfoItem.IsCompleted)
          : isPersonalInfoComplete(nextEmployeeData);
        setEmployeeId(typeof empId === 'number' ? empId : parseInt(String(empId), 10));
        setEmployeeData(nextEmployeeData);
        setCurrentStep(personalInfoReady ? 2 : 1);
      } catch {
        if (!cancelled) setError('Failed to load employee');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [existingEmployeeId]);

  const steps = useMemo(() => {
    const showPolice = onboardingSettings?.showPoliceReportStep !== false;
    const list: { number: number; title: string; id: StepId }[] = [
      { number: 1, title: 'Personal information', id: 'personal' },
      { number: 2, title: 'Documents', id: 'documents' },
    ];
    if (showPolice) list.push({ number: list.length + 1, title: 'Police report', id: 'police' });
    list.push({ number: list.length + 1, title: 'Review and contract', id: 'review' });
    return list.map((s, i) => ({ ...s, number: i + 1 }));
  }, [onboardingSettings]);

  useEffect(() => {
    if (steps.length > 0 && currentStep > steps.length) {
      setCurrentStep(steps.length);
    }
  }, [steps.length, currentStep]);

  const handleNext = async (data?: EmployeeData) => {
    if (currentStep === 1) {
      setLoading(true);
      setError('');
      const payload = { ...employeeData, ...data };
      const isUpdate = employeeId != null;
      try {
        const url = isUpdate
          ? `${API_URL}/api/employees/${employeeId}`
          : `${API_URL}/api/employees`;
        const response = await fetch(url, {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const msg = errorData.detail || errorData.error || 'Failed to save employee data';
          throw new Error(msg);
        }

        if (!isUpdate) {
          const result = await response.json();
          setEmployeeId(result.id);
        }
        setEmployeeData(payload);
        setCurrentStep(2);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save employee data');
      } finally {
        setLoading(false);
      }
      return;
    }

    setCurrentStep((step) => step + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((step) => step - 1);
    }
  };

  const handleStepClick = (step: number) => {
    if (step <= currentStep && employeeId) {
      setCurrentStep(step);
    }
  };

  const step = steps[currentStep - 1];

  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow="Workflow"
        title="Progress"
        description="The onboarding flow uses one consistent multi-step pattern so future workflows can reuse the same structure."
      >
        <Stepper
          steps={steps}
          currentStep={currentStep}
          canNavigateTo={(stepNumber) => Boolean(employeeId) && stepNumber <= currentStep}
          onStepClick={handleStepClick}
        />
      </SectionCard>

      {error ? <NoticeBanner tone="error" message={error} /> : null}

      <SectionCard
        eyebrow="Current Step"
        title={step ? step.title : 'Loading step'}
        description={employeeId ? `Employee record ${employeeId} is linked to this onboarding flow.` : 'Start by creating the employee record.'}
      >
        {loadingExisting ? (
          <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
            Loading employee record...
          </div>
        ) : !step ? (
          <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
            Loading workflow step...
          </div>
        ) : step.id === 'personal' ? (
          <PersonalInfoStep data={employeeData} onSubmit={handleNext} loading={loading} isEditing={employeeId != null} />
        ) : step.id === 'documents' && employeeId ? (
          <DocumentsStep employeeId={employeeId} onNext={handleNext} onBack={handleBack} nextLabel={steps[currentStep]?.title} />
        ) : step.id === 'police' && employeeId ? (
          <PoliceReportStep employeeId={employeeId} onNext={handleNext} onBack={handleBack} nextLabel={steps[currentStep]?.title} />
        ) : step.id === 'review' && employeeId ? (
          <ReviewStep employeeId={employeeId} employeeData={employeeData} onBack={handleBack} />
        ) : (
          <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
            This step is not yet available.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
