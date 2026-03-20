import type { NextConfig } from "next";

// Proxy to employee-onboarding API so the browser talks to same origin (avoids CORS and "Cannot connect" when API URL is wrong).
// In Docker, set EMPLOYEE_API_INTERNAL_URL=http://employee-api:4000 so the Next server can reach the API container.
const apiTarget =
  process.env.EMPLOYEE_API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_EMPLOYEE_API_URL ||
  (process.env.NODE_ENV === 'production' ? undefined : "http://localhost:4000");

if (!apiTarget && process.env.NODE_ENV === 'production') {
  throw new Error(
    'EMPLOYEE_API_INTERNAL_URL (or NEXT_PUBLIC_API_URL / NEXT_PUBLIC_EMPLOYEE_API_URL) is required in production.',
  );
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
