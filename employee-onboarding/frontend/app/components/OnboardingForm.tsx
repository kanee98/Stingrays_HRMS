'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PersonalInfoStep } from './steps/PersonalInfoStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { GramasevakaStep } from './steps/GramasevakaStep';
import { PoliceReportStep } from './steps/PoliceReportStep';
import { ReviewStep } from './steps/ReviewStep';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

  const steps = [
    { number: 1, title: 'Personal Information' },
    { number: 2, title: 'Documents' },
    { number: 3, title: 'Gramasevaka Details' },
    { number: 4, title: 'Police Report' },
    { number: 5, title: 'Review & Contract' },
  ];

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
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save employee data');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Onboarding</h1>
          <p className="text-gray-600">Complete all steps to finalize your onboarding process</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => handleStepClick(step.number)}
                    disabled={!employeeId && step.number > 1}
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition ${
                      currentStep >= step.number
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    } ${!employeeId && step.number > 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    {step.number}
                  </button>
                  <span className="mt-2 text-xs font-medium text-gray-600 text-center">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step.number ? 'bg-indigo-600' : 'bg-gray-200'
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
        <div className="bg-white rounded-lg shadow-md p-8">
          {loadingExisting ? (
            <div className="py-12 text-center text-gray-500">Loading employee…</div>
          ) : (
            <>
              {currentStep === 1 && (
                <PersonalInfoStep
                  data={employeeData}
                  onSubmit={handleNext}
                  loading={loading}
                />
              )}
              {currentStep === 2 && employeeId && (
                <DocumentsStep
                  employeeId={employeeId}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}
              {currentStep === 3 && employeeId && (
                <GramasevakaStep
                  employeeId={employeeId}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}
              {currentStep === 4 && employeeId && (
                <PoliceReportStep
                  employeeId={employeeId}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}
              {currentStep === 5 && employeeId && (
                <ReviewStep
                  employeeId={employeeId}
                  employeeData={employeeData}
                  onBack={handleBack}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
