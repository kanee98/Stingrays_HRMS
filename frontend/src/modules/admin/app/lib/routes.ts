export const ADMIN_BASE_PATH = '/admin';

export function adminPath(path = ''): string {
  if (!path || path === '/') {
    return ADMIN_BASE_PATH;
  }

  return `${ADMIN_BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
