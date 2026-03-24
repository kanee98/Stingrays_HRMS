import type { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@shared/lib/server/backendProxy';

export async function proxyAuthServiceRequest(request: NextRequest, upstreamPath: string): Promise<Response> {
  return proxyBackendRequest(request, upstreamPath);
}
