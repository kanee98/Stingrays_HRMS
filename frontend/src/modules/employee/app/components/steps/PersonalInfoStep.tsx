'use client';

import { useState, useEffect } from 'react';
import { Button } from '@shared/components/Button';
import { Field } from '@shared/components/Field';
import { getEmployeeApiUrl } from '@shared/lib/appUrls';
import { inputClasses, selectClasses } from '@shared/lib/ui';

const API_URL = getEmployeeApiUrl();

interface PersonalInfoStepProps {
  data: {
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
  };
  onSubmit: (data: PersonalInfoStepProps['data']) => void;
  loading: boolean;
}

interface DepartmentOption {
  Id: number;
  Name: string;
}

export function PersonalInfoStep({ data, onSubmit, loading }: PersonalInfoStepProps) {
  const [formData, setFormData] = useState(data);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/departments`);
        if (res.ok) {
          const list = await res.json();
          setDepartments(Array.isArray(list) ? list : []);
        }
      } catch {
        setDepartments([]);
      }
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-[var(--foreground)]">Personal information</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">Create the employee record that anchors the rest of the onboarding journey.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="First name" htmlFor="firstName" required>
          <input id="firstName" type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Last name" htmlFor="lastName" required>
          <input id="lastName" type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Email" htmlFor="email" required>
          <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Date of birth" htmlFor="dob" required>
          <input id="dob" type="date" name="dob" value={formData.dob} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="NIC number" htmlFor="nic" required>
          <input id="nic" type="text" name="nic" value={formData.nic} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Phone number" htmlFor="phone" required>
          <input id="phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Address" htmlFor="address" required>
          <input id="address" type="text" name="address" value={formData.address} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="City" htmlFor="city" required>
          <input id="city" type="text" name="city" value={formData.city} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Postal code" htmlFor="postalCode" required>
          <input id="postalCode" type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Position" htmlFor="position" required>
          <input id="position" type="text" name="position" value={formData.position} onChange={handleChange} required className={inputClasses} />
        </Field>
        <Field label="Department" htmlFor="department" required>
          <select id="department" name="department" value={formData.department} onChange={handleChange} required className={selectClasses}>
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.Id} value={department.Name}>
                {department.Name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Emergency contact name" htmlFor="emergencyContactName" required>
          <input
            id="emergencyContactName"
            type="text"
            name="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={handleChange}
            required
            className={inputClasses}
          />
        </Field>
        <Field label="Emergency contact phone" htmlFor="emergencyContactPhone" required>
          <input
            id="emergencyContactPhone"
            type="tel"
            name="emergencyContactPhone"
            value={formData.emergencyContactPhone}
            onChange={handleChange}
            required
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Next: documents'}
        </Button>
      </div>
    </form>
  );
}
