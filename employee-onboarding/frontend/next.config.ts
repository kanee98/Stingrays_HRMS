import type { NextConfig } from "next";

// Proxy to employee-onboarding API so the browser talks to same origin (avoids CORS and "Cannot connect" when API URL is wrong).
// In Docker, set EMPLOYEE_API_INTERNAL_URL=http://employee-api:4000 so the Next server can reach the API container.
const apiTarget =
  process.env.EMPLOYEE_API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_EMPLOYEE_API_URL ||
  "http://localhost:4000";

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
