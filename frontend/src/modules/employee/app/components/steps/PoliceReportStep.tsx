'use client';

import { useState, useRef } from 'react';
import { Button } from '@shared/components/Button';
import { Field } from '@shared/components/Field';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { inputClasses, secondaryButtonClasses } from '@shared/lib/ui';

const API_URL = getEmployeeApiUrl();

interface PoliceReportStepProps {
  employeeId: number;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
}

export function PoliceReportStep({ employeeId, onNext, onBack, nextLabel }: PoliceReportStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    reportNumber: '',
    policeStation: '',
    reportDate: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const submitData = new FormData();
    submitData.append('reportNumber', formData.reportNumber);
    submitData.append('policeStation', formData.policeStation);
    submitData.append('reportDate', formData.reportDate);

    if (fileInputRef.current?.files?.[0]) {
      submitData.append('report', fileInputRef.current.files[0]);
    }

    try {
      const response = await fetch(`${API_URL}/api/employees/${employeeId}/police-report`, {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save police report details');
      }

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save police report details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-[var(--foreground)]">Police report</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">Record the police clearance details and attach the supporting report if available.</p>
      </div>

      {error ? <NoticeBanner tone="error" message={error} /> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Report number" htmlFor="reportNumber" required>
          <input id="reportNumber" type="text" name="reportNumber" value={formData.reportNumber} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Police station" htmlFor="policeStation" required>
          <input id="policeStation" type="text" name="policeStation" value={formData.policeStation} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Report date" htmlFor="reportDate" required>
          <input id="reportDate" type="date" name="reportDate" value={formData.reportDate} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Police report file" htmlFor="policeFile" hint="Upload a PDF or image copy of the report.">
          <input id="policeFile" ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className={secondaryButtonClasses} />
        </Field>
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : nextLabel ? `Next: ${nextLabel}` : 'Next'}
        </Button>
      </div>
    </form>
  );
}
