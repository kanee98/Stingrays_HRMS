export const PAYROLL_BASE_PATH = '/payroll';

export function payrollPath(path = ''): string {
  if (!path || path === '/') {
    return PAYROLL_BASE_PATH;
  }

  return `${PAYROLL_BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
