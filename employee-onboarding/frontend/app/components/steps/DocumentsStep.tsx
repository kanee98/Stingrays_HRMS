'use client';

import { useState, useRef, useEffect } from 'react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_EMPLOYEE_API_URL ||
  "/api-proxy";

interface DocumentTypeRow {
  Id: number;
  Name: string;
  IsRequired: boolean;
  SortOrder: number;
  IsActive: boolean;
  Description?: string | null;
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
    return () => { cancelled = true; };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(docType);

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
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload document. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  if (loadingTypes) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Documents</h2>
        <p className="text-gray-500">Loading document types...</p>
      </div>
    );
  }

  if (documentTypes.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Documents</h2>
        <p className="text-gray-500">No document types configured. An admin can add them in Settings.</p>
        <div className="flex justify-between pt-6">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
          >
            {nextLabel ?? 'Next'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Documents</h2>

      <div className="space-y-4">
        {documentTypes.map((doc) => (
          <div
            key={doc.Id}
            className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {doc.Name}
                  {doc.IsRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                <p className="text-xs text-gray-500">
                  Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                </p>
              </div>
              <div className="ml-4">
                {uploadedDocs[doc.Name] ? (
                  <div className="flex items-center text-green-600">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Uploaded
                  </div>
                ) : (
                  <input
                    ref={(el) => {
                      fileInputsRef.current[doc.Name] = el;
                    }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => handleFileChange(e, doc.Name)}
                    disabled={uploading === doc.Name}
                    className="hidden"
                    id={`file-${doc.Id}`}
                  />
                )}
                <label
                  htmlFor={`file-${doc.Id}`}
                  className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition ${
                    uploadedDocs[doc.Name]
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : uploading === doc.Name
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {uploading === doc.Name
                    ? 'Uploading...'
                    : uploadedDocs[doc.Name]
                    ? 'Uploaded'
                    : 'Choose File'}
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
        >
          {nextLabel ?? 'Next'}
        </button>
      </div>
    </div>
  );
}
