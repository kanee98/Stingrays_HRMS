'use client';

import { useAuth } from '../contexts/AuthContext';

const EMPLOYEE_UI_URL = process.env.NEXT_PUBLIC_EMPLOYEE_UI_URL || 'http://localhost:3001';
const LOGOUT_REDIRECT_URL = `${EMPLOYEE_UI_URL}?logout=1`;

export function AppNavbar() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = LOGOUT_REDIRECT_URL;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <a href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700">
                HRMS
              </a>
            </div>
            <nav className="ml-10 flex space-x-8">
              <a
                href="/"
                className="text-gray-900 hover:text-indigo-600 px-3 py-2 text-sm font-medium border-b-2 border-indigo-600"
              >
                Dashboard
              </a>
              <a
                href={EMPLOYEE_UI_URL}
                className="text-gray-500 hover:text-indigo-600 px-3 py-2 text-sm font-medium"
              >
                Employee Onboarding
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-indigo-600 px-3 py-2 text-sm font-medium"
              >
                Payroll
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              <span className="font-medium">{user?.email}</span>
              <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 border border-gray-300 rounded-lg hover:border-indigo-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
