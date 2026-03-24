export const EMPLOYEE_BASE_PATH = '/employee';

export function employeePath(path = ''): string {
  if (!path || path === '/') {
    return EMPLOYEE_BASE_PATH;
  }

  return `${EMPLOYEE_BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
