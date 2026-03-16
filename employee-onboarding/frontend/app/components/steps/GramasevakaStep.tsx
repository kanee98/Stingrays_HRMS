'use client';

import { useState, useRef } from 'react';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save gramasevaka details');
      }

      onNext();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Gramasevaka Certificate Details</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gramasevaka Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="gramasevakaName"
            value={formData.gramasevakaName}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gramasevaka Office <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="gramasevakaOffice"
            value={formData.gramasevakaOffice}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gramasevaka Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="gramasevakaPhone"
            value={formData.gramasevakaPhone}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Certificate Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="certificateNumber"
            value={formData.certificateNumber}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Certificate Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="certificateDate"
            value={formData.certificateDate}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Certificate
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Saving...' : (nextLabel ?? 'Next: Police Report')}
        </button>
      </div>
    </form>
  );
}
