'use client';

import { useState, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface DocumentsStepProps {
  employeeId: number;
  onNext: () => void;
  onBack: () => void;
}

const documentTypes = [
  { name: 'NIC Copy', type: 'NIC Copy', required: true },
  { name: 'Birth Certificate', type: 'Birth Certificate', required: true },
  { name: 'Educational Certificates', type: 'Educational Certificates', required: true },
  { name: 'Medical Report', type: 'Medical Report', required: false },
  { name: 'Reference Letters', type: 'Reference Letters', required: false },
];

export function DocumentsStep({ employeeId, onNext, onBack }: DocumentsStepProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({});
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

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
        throw new Error('Failed to upload document');
      }

      setUploadedDocs({ ...uploadedDocs, [docType]: true });
    } catch (error) {
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Documents</h2>

      <div className="space-y-4">
        {documentTypes.map((doc) => (
          <div
            key={doc.type}
            className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {doc.name}
                  {doc.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <p className="text-xs text-gray-500">
                  Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                </p>
              </div>
              <div className="ml-4">
                {uploadedDocs[doc.type] ? (
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
                      fileInputsRef.current[doc.type] = el
                    }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => handleFileChange(e, doc.type)}
                    disabled={uploading === doc.type}
                    className="hidden"
                    id={`file-${doc.type}`}
                  />
                )}
                <label
                  htmlFor={`file-${doc.type}`}
                  className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition ${
                    uploadedDocs[doc.type]
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : uploading === doc.type
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {uploading === doc.type
                    ? 'Uploading...'
                    : uploadedDocs[doc.type]
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
          Next: Gramasevaka Details
        </button>
      </div>
    </div>
  );
}
