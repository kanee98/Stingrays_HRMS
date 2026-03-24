import type { NextRequest } from 'next/server';
import { proxyBackendRequest } from './backendProxy';

export async function proxyAuthServiceRequest(request: NextRequest, upstreamPath: string): Promise<Response> {
  return proxyBackendRequest(request, upstreamPath);
}
