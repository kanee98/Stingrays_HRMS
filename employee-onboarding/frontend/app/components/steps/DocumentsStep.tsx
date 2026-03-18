'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@shared/components/Button';
import { Field } from '@shared/components/Field';
import { NoticeBanner } from '@shared/components/NoticeBanner';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { inputClasses, secondaryButtonClasses } from '@shared/lib/ui';

const API_URL = getEmployeeApiUrl();

interface DocumentTypeField {
  Id: number;
  FieldKey: string;
  Label: string;
  FieldType: string;
  IsRequired: boolean;
  SortOrder: number;
}

interface DocumentTypeWithFields {
  Id: number;
  Name: string;
  IsRequired: boolean;
  SortOrder: number;
  Description?: string;
  Fields: DocumentTypeField[];
}

interface EmployeeDocument {
  DocumentType: string;
  MetadataJson?: string | null;
}

interface DocumentsStepProps {
  employeeId: number;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
}

export function DocumentsStep({ employeeId, onNext, onBack, nextLabel }: DocumentsStepProps) {
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeWithFields[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<number, Record<string, string>>>({});
  const [error, setError] = useState('');
  const fileInputsRef = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/document-types/with-fields`);
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

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/employees/${employeeId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const docs: EmployeeDocument[] = data.documents ?? [];
        const byName: Record<string, boolean> = {};
        const latestMetadataByType: Record<string, Record<string, string>> = {};
        docs.forEach((d) => {
          byName[d.DocumentType] = true;
          if (!latestMetadataByType[d.DocumentType] && d.MetadataJson) {
            try {
              const parsed = JSON.parse(d.MetadataJson);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                latestMetadataByType[d.DocumentType] = parsed as Record<string, string>;
              }
            } catch {
              // Ignore invalid stored metadata
            }
          }
        });
        if (!cancelled) {
          setUploadedDocs(byName);
          setFieldValues((prev) => {
            const next = { ...prev };
            documentTypes.forEach((docType) => {
              const storedValues = latestMetadataByType[docType.Name];
              if (storedValues) {
                next[docType.Id] = {
                  ...(next[docType.Id] ?? {}),
                  ...storedValues,
                };
              }
            });
            return next;
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId, documentTypes]);

  const setFieldValue = (docTypeId: number, key: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [docTypeId]: {
        ...(prev[docTypeId] ?? {}),
        [key]: value,
      },
    }));
  };

  const getFieldValue = (docTypeId: number, key: string): string => {
    return fieldValues[docTypeId]?.[key] ?? '';
  };

  const handleSubmitDocument = async (docType: DocumentTypeWithFields) => {
    const fileInput = fileInputsRef.current[docType.Id];
    const file = fileInput?.files?.[0];
    const hasFileField = docType.Fields.some((f) => f.FieldType === 'file');
    const isUploaded = uploadedDocs[docType.Name];
    if (hasFileField && !file && docType.IsRequired && !isUploaded) {
      setError('Please select a file to upload.');
      return;
    }
    if (!hasFileField && !file && !isUploaded) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(docType.Name);
    setError('');

    const formData = new FormData();
    formData.append('documentType', docType.Name);

    const meta: Record<string, string> = {};
    docType.Fields.forEach((f) => {
      if (f.FieldType !== 'file') {
        const v = getFieldValue(docType.Id, f.FieldKey);
        if (v !== '') meta[f.FieldKey] = v;
      }
    });
    const missingRequiredField = docType.Fields.find(
      (f) => f.FieldType !== 'file' && f.IsRequired && !getFieldValue(docType.Id, f.FieldKey).trim()
    );
    if (missingRequiredField) {
      setUploading(null);
      setError(`Please enter ${missingRequiredField.Label}.`);
      return;
    }
    if (Object.keys(meta).length > 0) {
      formData.append('fieldValues', JSON.stringify(meta));
    }
    if (file) formData.append('document', file);

    try {
      const response = await fetch(`${API_URL}/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload document');
      }

      setUploadedDocs((prev) => ({ ...prev, [docType.Name]: true }));
      if (fileInput) {
        fileInput.value = '';
      }
      setExpandedId(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setError('');
  };

  if (loadingTypes) {
    return (
      <div className="rounded-[24px] bg-[var(--surface-muted)] px-6 py-10 text-center text-sm text-[var(--muted)]">
        Loading document requirements...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-[var(--foreground)]">Documents</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Click a document type to expand and enter the required details and upload the file. The flow is driven by the document types configured in settings.
        </p>
      </div>

      {error ? <NoticeBanner tone="error" message={error} /> : null}

      {documentTypes.length === 0 ? (
        <NoticeBanner
          tone="warning"
          message="No document types are configured yet. An administrator can add them in Settings → Document types."
        />
      ) : (
        <div className="space-y-3">
          {documentTypes.map((docType) => {
            const isExpanded = expandedId === docType.Id;
            const isUploaded = uploadedDocs[docType.Name];
            return (
              <div
                key={docType.Id}
                className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-muted)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(docType.Id)}
                  className="flex w-full flex-col gap-2 p-5 text-left transition hover:bg-[var(--surface-hover)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {docType.Name}
                      {docType.IsRequired ? <span className="ml-1 text-red-500">*</span> : null}
                    </span>
                    {isUploaded ? (
                      <span className="inline-flex rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        Uploaded
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm text-[var(--muted)]">
                    {isExpanded ? '▼ Collapse' : '▶ Enter details & upload'}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="border-t border-[var(--surface-border)] bg-[var(--surface)] p-5">
                    {docType.Fields.length === 0 ? (
                      <p className="mb-4 text-sm text-[var(--muted)]">
                        No extra fields configured. Upload a file below.
                      </p>
                    ) : (
                      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {docType.Fields.filter((f) => f.FieldType !== 'file').map((f) => (
                          <Field key={f.Id} label={f.Label} htmlFor={`field-${docType.Id}-${f.FieldKey}`} required={f.IsRequired}>
                            {f.FieldType === 'date' ? (
                              <input
                                id={`field-${docType.Id}-${f.FieldKey}`}
                                type="date"
                                value={getFieldValue(docType.Id, f.FieldKey)}
                                onChange={(e) => setFieldValue(docType.Id, f.FieldKey, e.target.value)}
                                className={inputClasses}
                                required={f.IsRequired}
                              />
                            ) : f.FieldType === 'tel' ? (
                              <input
                                id={`field-${docType.Id}-${f.FieldKey}`}
                                type="tel"
                                value={getFieldValue(docType.Id, f.FieldKey)}
                                onChange={(e) => setFieldValue(docType.Id, f.FieldKey, e.target.value)}
                                className={inputClasses}
                                required={f.IsRequired}
                              />
                            ) : (
                              <input
                                id={`field-${docType.Id}-${f.FieldKey}`}
                                type="text"
                                value={getFieldValue(docType.Id, f.FieldKey)}
                                onChange={(e) => setFieldValue(docType.Id, f.FieldKey, e.target.value)}
                                className={inputClasses}
                                required={f.IsRequired}
                              />
                            )}
                          </Field>
                        ))}
                        {docType.Fields.some((f) => f.FieldType === 'file') ? (
                          <Field
                            label={docType.Fields.find((f) => f.FieldType === 'file')?.Label ?? 'Document file'}
                            htmlFor={`file-${docType.Id}`}
                            required={docType.IsRequired}
                          >
                            <input
                              ref={(el) => {
                                fileInputsRef.current[docType.Id] = el;
                              }}
                              id={`file-${docType.Id}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              className={secondaryButtonClasses}
                            />
                          </Field>
                        ) : null}
                      </div>
                    )}

                    {!docType.Fields.some((f) => f.FieldType === 'file') ? (
                      <div className="mb-6">
                        <label htmlFor={`file-${docType.Id}`} className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                          Document file
                          {docType.IsRequired ? <span className="ml-1 text-red-500">*</span> : null}
                        </label>
                        <input
                          ref={(el) => {
                            fileInputsRef.current[docType.Id] = el;
                          }}
                          id={`file-${docType.Id}`}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          className={secondaryButtonClasses}
                        />
                        <p className="mt-1 text-xs text-[var(--muted)]">PDF, JPG, PNG, DOC, DOCX up to 10MB.</p>
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      onClick={() => void handleSubmitDocument(docType)}
                      disabled={uploading === docType.Name}
                    >
                      {uploading === docType.Name ? 'Uploading...' : isUploaded ? 'Update document' : 'Save & upload'}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
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
