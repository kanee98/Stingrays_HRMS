export * from '../../shared/lib/appUrls';

import { isSafeRelativePath } from '../../shared/lib/appUrls';

export function buildLocalChangePasswordUrl(nextPath?: string): string {
  if (!nextPath || !isSafeRelativePath(nextPath)) {
    return '/change-password';
  }

  // Build a server-safe relative change-password path.
  const params = new URLSearchParams();
  params.set('next', nextPath);
  return `/change-password?${params.toString()}`;
}
