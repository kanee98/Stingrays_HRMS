'use client';

import { useState, useEffect } from 'react';
import { Button } from '@shared/components/Button';
import { Field } from '@shared/components/Field';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { SectionCard } from '@shared/components/SectionCard';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { inputClasses, selectClasses } from '@shared/lib/ui';

const API_URL = getEmployeeApiUrl();

interface ReviewStepProps {
  employeeId: number;
  employeeData: {
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    department: string;
  };
  onBack: () => void;
}

interface ChecklistItem {
  Id: number;
  ItemName: string;
  IsCompleted: boolean;
  IsRequired: boolean;
}

interface ContractRecord {
  Id: number;
  ContractStart: string;
  ContractEnd: string | null;
  ContractType: string;
  Salary: string;
  Status: string;
}

export function ReviewStep({ employeeId, employeeData, onBack }: ReviewStepProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [contractData, setContractData] = useState({
    contractStart: '',
    contractEnd: '',
    contractType: 'permanent',
    salary: '',
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [contract, setContract] = useState<ContractRecord | null>(null);

  useEffect(() => {
    void fetchChecklist();
    void fetchContract();
  }, [employeeId]);

  const fetchChecklist = async () => {
    try {
      const response = await fetch(`${API_URL}/api/employees/${employeeId}`);
      const data = await response.json().catch(() => ({}));
      setChecklist(Array.isArray(data.checklist) ? data.checklist : []);
    } catch {
      setChecklist([]);
    }
  };

  const fetchContract = async () => {
    try {
      const response = await fetch(`${API_URL}/api/employees/${employeeId}/contract`);
      if (response.ok) {
        const data = await response.json();
        setContract(data);
      }
    } catch {
      setContract(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setContractData({
      ...contractData,
      [e.target.name]: e.target.value,
    });
  };

  const handleGenerateContract = async () => {
    setGenerating(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/employees/${employeeId}/generate-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate contract');
      }

      await fetchContract();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate contract');
    } finally {
      setGenerating(false);
    }
  };

  const requiredItems = checklist.filter((item) => item.IsRequired);
  const completedRequired = requiredItems.filter((item) => item.IsCompleted);
  const canGenerateContract = requiredItems.length === 0 || completedRequired.length === requiredItems.length;
  const completionPercent = requiredItems.length === 0 ? 100 : (completedRequired.length / requiredItems.length) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-[var(--foreground)]">Review and contract</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">Validate onboarding completion and generate the employee contract once the required items are done.</p>
      </div>

      {error ? <NoticeBanner tone="error" message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
        <SectionCard eyebrow="Employee Summary" title={`${employeeData.firstName} ${employeeData.lastName}`} description="Core details carried forward into contract generation.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Email</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{employeeData.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Position</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{employeeData.position || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Department</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{employeeData.department || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Employee ID</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{employeeId}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Checklist" title="Required readiness" description="All required onboarding items must be completed before contract generation.">
          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.Id} className="flex items-center justify-between rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
                <div>
                  <p className={`text-sm font-medium ${item.IsCompleted ? 'text-[var(--foreground)]' : 'text-[var(--muted-strong)]'}`}>{item.ItemName}</p>
                  {item.IsRequired ? <p className="mt-1 text-xs text-red-500">Required item</p> : null}
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.IsCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}`}>
                  {item.IsCompleted ? 'Completed' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm text-[var(--muted)]">
              <span>Required completion</span>
              <span>{completedRequired.length} / {requiredItems.length}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-border)]">
              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
        </SectionCard>
      </div>

      {!contract ? (
        <SectionCard eyebrow="Contract" title="Generate contract" description="Create the contract record as the final step of onboarding.">
          {!canGenerateContract ? (
            <NoticeBanner tone="warning" message="Complete all required onboarding items before generating the contract." />
          ) : null}
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Contract start date" htmlFor="contractStart" required>
              <input id="contractStart" type="date" name="contractStart" value={contractData.contractStart} onChange={handleChange} required className={inputClasses} />
            </Field>
            <Field label="Contract end date" htmlFor="contractEnd">
              <input id="contractEnd" type="date" name="contractEnd" value={contractData.contractEnd} onChange={handleChange} className={inputClasses} />
            </Field>
            <Field label="Contract type" htmlFor="contractType" required>
              <select id="contractType" name="contractType" value={contractData.contractType} onChange={handleChange} required className={selectClasses}>
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="intern">Intern</option>
              </select>
            </Field>
            <Field label="Salary (LKR)" htmlFor="salary" required>
              <input id="salary" type="number" name="salary" value={contractData.salary} onChange={handleChange} required min="0" step="0.01" className={inputClasses} />
            </Field>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button type="button" onClick={() => void handleGenerateContract()} disabled={!canGenerateContract || generating}>
              {generating ? 'Generating...' : 'Generate contract'}
            </Button>
          </div>
        </SectionCard>
      ) : (
        <SectionCard eyebrow="Contract" title="Contract generated" description="The onboarding workflow is complete and the employee record now has an attached contract.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Contract ID</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{contract.Id}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Type</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{contract.ContractType}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Start</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{new Date(contract.ContractStart).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">End</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{contract.ContractEnd ? new Date(contract.ContractEnd).toLocaleDateString() : 'Open ended'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Salary</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">LKR {Number(contract.Salary).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Status</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">{contract.Status}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <Button type="button" variant="secondary" onClick={onBack}>
              Back
            </Button>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Onboarding complete</span>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
