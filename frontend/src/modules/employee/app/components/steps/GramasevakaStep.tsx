'use client';

import { useState, useRef } from 'react';
import { Button } from '@shared/components/Button';
import { Field } from '@shared/components/Field';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { inputClasses, secondaryButtonClasses } from '@shared/lib/ui';

const API_URL = getEmployeeApiUrl();

interface GramasevakaStepProps {
  employeeId: number;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
}

export function GramasevakaStep({ employeeId, onNext, onBack, nextLabel }: GramasevakaStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    gramasevakaName: '',
    gramasevakaOffice: '',
    gramasevakaPhone: '',
    certificateNumber: '',
    certificateDate: '',
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
    submitData.append('gramasevakaName', formData.gramasevakaName);
    submitData.append('gramasevakaOffice', formData.gramasevakaOffice);
    submitData.append('gramasevakaPhone', formData.gramasevakaPhone);
    submitData.append('certificateNumber', formData.certificateNumber);
    submitData.append('certificateDate', formData.certificateDate);

    if (fileInputRef.current?.files?.[0]) {
      submitData.append('certificate', fileInputRef.current.files[0]);
    }

    try {
      const response = await fetch(`${API_URL}/api/employees/${employeeId}/gramasevaka`, {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save gramasevaka details');
      }

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gramasevaka details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-[var(--foreground)]">Gramasevaka certificate</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">Capture reference details and upload the supporting certificate before proceeding.</p>
      </div>

      {error ? <NoticeBanner tone="error" message={error} /> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Gramasevaka name" htmlFor="gramasevakaName" required>
          <input id="gramasevakaName" type="text" name="gramasevakaName" value={formData.gramasevakaName} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Gramasevaka office" htmlFor="gramasevakaOffice" required>
          <input id="gramasevakaOffice" type="text" name="gramasevakaOffice" value={formData.gramasevakaOffice} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Gramasevaka phone" htmlFor="gramasevakaPhone" required>
          <input id="gramasevakaPhone" type="tel" name="gramasevakaPhone" value={formData.gramasevakaPhone} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Certificate number" htmlFor="certificateNumber" required>
          <input id="certificateNumber" type="text" name="certificateNumber" value={formData.certificateNumber} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Certificate date" htmlFor="certificateDate" required>
          <input id="certificateDate" type="date" name="certificateDate" value={formData.certificateDate} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Certificate file" htmlFor="gramasevakaFile" hint="Upload a PDF or image copy of the certificate.">
          <input id="gramasevakaFile" ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className={secondaryButtonClasses} />
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
