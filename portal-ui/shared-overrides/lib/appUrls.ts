export * from '../../shared/lib/appUrls';

import { isSafeRelativePath } from '../../shared/lib/appUrls';

export function buildLocalChangePasswordUrl(nextPath?: string): string {
  if (!nextPath || !isSafeRelativePath(nextPath)) {
    return '/change-password';
  }

  const changePasswordUrl = new URL(
    '/change-password',
    typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin,
  );
  changePasswordUrl.searchParams.set('next', nextPath);
  return `${changePasswordUrl.pathname}${changePasswordUrl.search}`;
}
