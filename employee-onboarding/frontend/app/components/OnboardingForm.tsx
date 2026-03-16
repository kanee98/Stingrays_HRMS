'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { PersonalInfoStep } from './steps/PersonalInfoStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { GramasevakaStep } from './steps/GramasevakaStep';
import { PoliceReportStep } from './steps/PoliceReportStep';
import { ReviewStep } from './steps/ReviewStep';

const API_URL = getEmployeeApiUrl();

type StepId = 'personal' | 'documents' | 'gramasevaka' | 'police' | 'review';

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

export function OnboardingForm() {
  const searchParams = useSearchParams();
  const existingEmployeeId = searchParams.get('employeeId');
  const [currentStep, setCurrentStep] = useState(1);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!existingEmployeeId);
  const [onboardingSettings, setOnboardingSettings] = useState<{
    showGramasevakaStep: boolean;
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

  // Fetch onboarding step visibility (Gramasevaka, Police Report optional)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/onboarding`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setOnboardingSettings({
            showGramasevakaStep: data.showGramasevakaStep !== false,
            showPoliceReportStep: data.showPoliceReportStep !== false,
          });
        }
      } catch {
        if (!cancelled) setOnboardingSettings({ showGramasevakaStep: true, showPoliceReportStep: true });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // When opened from a prospect: load existing employee and start at step 2
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
        setEmployeeId(typeof empId === 'number' ? empId : parseInt(String(empId), 10));
        setEmployeeData({
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
        });
        setCurrentStep(2);
      } catch {
        if (!cancelled) setError('Failed to load employee');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [existingEmployeeId]);

  const steps = useMemo(() => {
    const showGramasevaka = onboardingSettings?.showGramasevakaStep !== false;
    const showPolice = onboardingSettings?.showPoliceReportStep !== false;
    const list: { number: number; title: string; id: StepId }[] = [
      { number: 1, title: 'Personal Information', id: 'personal' },
      { number: 2, title: 'Documents', id: 'documents' },
    ];
    if (showGramasevaka) list.push({ number: list.length + 1, title: 'Gramasevaka Details', id: 'gramasevaka' });
    if (showPolice) list.push({ number: list.length + 1, title: 'Police Report', id: 'police' });
    list.push({ number: list.length + 1, title: 'Review & Contract', id: 'review' });
    return list.map((s, i) => ({ ...s, number: i + 1 }));
  }, [onboardingSettings]);

  // Clamp current step when steps shrink (e.g. after settings load with optional steps off)
  useEffect(() => {
    if (steps.length > 0 && currentStep > steps.length) {
      setCurrentStep(steps.length);
    }
  }, [steps.length, currentStep]);

  const handleNext = async (data?: any) => {
    if (currentStep === 1) {
      // Save personal information
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_URL}/api/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...employeeData, ...data }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const msg = errorData.detail || errorData.error || 'Failed to save employee data';
          throw new Error(msg);
        }

        const result = await response.json();
        setEmployeeId(result.id);
        setEmployeeData({ ...employeeData, ...data });
        setCurrentStep(2);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    if (step <= currentStep && employeeId) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-6 mb-6">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Employee Onboarding</h1>
          <p className="text-[var(--muted)]">Complete all steps to finalize your onboarding process</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => handleStepClick(step.number)}
                    disabled={!employeeId && step.number > 1}
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition ${
                      currentStep >= step.number
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--surface-border)] text-[var(--muted)]'
                    } ${!employeeId && step.number > 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    {step.number}
                  </button>
                  <span className="mt-2 text-xs font-medium text-[var(--muted)] text-center">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step.number ? 'bg-[var(--primary)]' : 'bg-[var(--surface-border)]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form Content */}
        <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-[var(--radius)] shadow-[var(--shadow)] p-8">
          {loadingExisting ? (
            <div className="py-12 text-center text-gray-500">Loading employee…</div>
          ) : (
            (() => {
              const step = steps[currentStep - 1];
              if (!step) return <div className="py-12 text-center text-gray-500">Loading steps…</div>;
              if (step.id === 'personal') {
                return (
                  <PersonalInfoStep
                    data={employeeData}
                    onSubmit={handleNext}
                    loading={loading}
                  />
                );
              }
              if (step.id === 'documents' && employeeId) {
                const nextStep = steps[currentStep];
                return (
                  <DocumentsStep
                    employeeId={employeeId}
                    onNext={handleNext}
                    onBack={handleBack}
                    nextLabel={nextStep ? `Next: ${nextStep.title}` : undefined}
                  />
                );
              }
              if (step.id === 'gramasevaka' && employeeId) {
                const nextStep = steps[currentStep];
                return (
                  <GramasevakaStep
                    employeeId={employeeId}
                    onNext={handleNext}
                    onBack={handleBack}
                    nextLabel={nextStep ? `Next: ${nextStep.title}` : undefined}
                  />
                );
              }
              if (step.id === 'police' && employeeId) {
                const nextStep = steps[currentStep];
                return (
                  <PoliceReportStep
                    employeeId={employeeId}
                    onNext={handleNext}
                    onBack={handleBack}
                    nextLabel={nextStep ? `Next: ${nextStep.title}` : undefined}
                  />
                );
              }
              if (step.id === 'review' && employeeId) {
                return (
                  <ReviewStep
                    employeeId={employeeId}
                    employeeData={employeeData}
                    onBack={handleBack}
                  />
                );
              }
              return <div className="py-12 text-center text-gray-500">Loading…</div>;
            })()
          )}
        </div>
      </div>
    </div>
  );
}
