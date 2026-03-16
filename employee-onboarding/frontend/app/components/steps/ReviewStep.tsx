'use client';

import { useState, useEffect } from 'react';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';

const API_URL = getEmployeeApiUrl();

interface ReviewStepProps {
  employeeId: number;
  employeeData: any;
  onBack: () => void;
}

export function ReviewStep({ employeeId, employeeData, onBack }: ReviewStepProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [contractData, setContractData] = useState({
    contractStart: '',
    contractEnd: '',
    contractType: 'permanent',
    salary: '',
  });
  const [checklist, setChecklist] = useState<any[]>([]);
  const [contract, setContract] = useState<any>(null);

  useEffect(() => {
    fetchChecklist();
    fetchContract();
  }, []);

  const fetchChecklist = async () => {
    try {
      const response = await fetch(`${API_URL}/api/employees/${employeeId}`);
      const data = await response.json();
      setChecklist(data.checklist || []);
    } catch (error) {
      console.error('Failed to fetch checklist:', error);
    }
  };

  const fetchContract = async () => {
    try {
      const response = await fetch(`${API_URL}/api/employees/${employeeId}/contract`);
      if (response.ok) {
        const data = await response.json();
        setContract(data);
      }
    } catch (error) {
      // Contract doesn't exist yet
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate contract');
      }

      await fetchContract();
      alert('Contract generated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const requiredItems = checklist.filter((item) => item.IsRequired);
  const completedRequired = requiredItems.filter((item) => item.IsCompleted);

  const canGenerateContract = completedRequired.length === requiredItems.length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Contract Generation</h2>

      {/* Checklist Status */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Onboarding Checklist</h3>
        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.Id} className="flex items-center justify-between">
              <div className="flex items-center">
                {item.IsCompleted ? (
                  <svg
                    className="w-5 h-5 text-green-600 mr-2"
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
                ) : (
                  <svg
                    className="w-5 h-5 text-gray-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                <span className={item.IsCompleted ? 'text-gray-900' : 'text-gray-500'}>
                  {item.ItemName}
                </span>
                {item.IsRequired && (
                  <span className="ml-2 text-xs text-red-500">*</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Progress: {completedRequired.length} of {requiredItems.length} required items completed
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{
                width: `${(completedRequired.length / requiredItems.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Contract Generation */}
      {!contract ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {!canGenerateContract && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4">
              Please complete all required onboarding items before generating the contract.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="contractStart"
                value={contractData.contractStart}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract End Date
              </label>
              <input
                type="date"
                name="contractEnd"
                value={contractData.contractEnd}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract Type <span className="text-red-500">*</span>
              </label>
              <select
                name="contractType"
                value={contractData.contractType}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salary (LKR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="salary"
                value={contractData.salary}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleGenerateContract}
              disabled={!canGenerateContract || generating}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {generating ? 'Generating...' : 'Generate Contract'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <svg
              className="w-6 h-6 text-green-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-green-900">Contract Generated Successfully!</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Contract ID:</strong> {contract.Id}</p>
            <p><strong>Start Date:</strong> {new Date(contract.ContractStart).toLocaleDateString()}</p>
            {contract.ContractEnd && (
              <p><strong>End Date:</strong> {new Date(contract.ContractEnd).toLocaleDateString()}</p>
            )}
            <p><strong>Type:</strong> {contract.ContractType}</p>
            <p><strong>Salary:</strong> LKR {parseFloat(contract.Salary).toLocaleString()}</p>
            <p><strong>Status:</strong> {contract.Status}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
        >
          Back
        </button>
        {contract && (
          <div className="text-sm text-gray-600 flex items-center">
            <svg
              className="w-5 h-5 text-green-600 mr-2"
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
            Onboarding Complete!
          </div>
        )}
      </div>
    </div>
  );
}
