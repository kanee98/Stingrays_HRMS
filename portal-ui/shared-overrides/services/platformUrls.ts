export * from '../../shared/services/platformUrls';

import { getPortalUrl } from '../../shared/services/platformUrls';

export function buildPortalPasswordChangeUrl(returnUrl?: string): string {
  const changePasswordUrl = new URL('/change-password', getPortalUrl());

  if (returnUrl) {
    changePasswordUrl.searchParams.set('returnUrl', returnUrl);
  }

  return changePasswordUrl.toString();
}
