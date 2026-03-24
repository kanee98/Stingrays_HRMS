'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@shared/components/Button';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { secondaryButtonClasses } from '@shared/lib/ui';

const API_URL = getEmployeeApiUrl();

interface DocumentTypeRow {
  Id: number;
  Name: string;
  IsRequired: boolean;
}

interface DocumentsStepProps {
  employeeId: number;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
}

export function DocumentsStep({ employeeId, onNext, onBack, nextLabel }: DocumentsStepProps) {
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRow[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/document-types`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setDocumentTypes(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setDocumentTypes([]);
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(docType);
    setError('');

    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', docType);

    try {
      const response = await fetch(`${API_URL}/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload document');
      }

      setUploadedDocs((prev) => ({ ...prev, [docType]: true }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  if (loadingTypes) {
    return <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">Loading document requirements...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-[var(--foreground)]">Documents</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">Upload each required onboarding document before moving deeper into the workflow.</p>
      </div>

      {error ? <NoticeBanner tone="error" message={error} /> : null}

      {documentTypes.length === 0 ? (
        <NoticeBanner tone="warning" message="No document types are configured yet. An administrator can add them in onboarding settings." />
      ) : (
        <div className="space-y-4">
          {documentTypes.map((documentType) => (
            <div key={documentType.Id} className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-muted)] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {documentType.Name}
                    {documentType.IsRequired ? <span className="ml-1 text-red-500">*</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Accepted formats: PDF, JPG, PNG, DOC, DOCX up to 10MB.</p>
                </div>
                <div>
                  <input
                    ref={(el) => {
                      fileInputsRef.current[documentType.Name] = el;
                    }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(event) => void handleFileChange(event, documentType.Name)}
                    disabled={uploading === documentType.Name}
                    className="hidden"
                    id={`file-${documentType.Id}`}
                  />
                  {uploadedDocs[documentType.Name] ? (
                    <span className="inline-flex rounded-xl bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      Uploaded
                    </span>
                  ) : (
                    <label htmlFor={`file-${documentType.Id}`} className={secondaryButtonClasses}>
                      {uploading === documentType.Name ? 'Uploading...' : 'Choose file'}
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          {nextLabel ? `Next: ${nextLabel}` : 'Next'}
        </Button>
      </div>
    </div>
  );
}
