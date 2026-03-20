import type { NextRequest } from 'next/server';

const HOP_BY_HOP_HEADERS = [
  'connection',
  'content-length',
  'expect',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
] as const;

function getHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const [firstValue] = value.split(',');
  const normalizedValue = firstValue?.trim();
  return normalizedValue || null;
}

function getSuperAdminApiBaseUrl(): string {
  const url = process.env.SUPER_ADMIN_API_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPER_ADMIN_API_URL;
  if (!url) {
    throw new Error('SUPER_ADMIN_API URL is not configured (set SUPER_ADMIN_API_INTERNAL_URL or NEXT_PUBLIC_SUPER_ADMIN_API_URL)');
  }
  return url;
}

function getForwardedHost(request: NextRequest): string {
  return getHeaderValue(request.headers.get('x-forwarded-host')) || request.headers.get('host') || request.nextUrl.host;
}

function getForwardedProto(request: NextRequest): string {
  return getHeaderValue(request.headers.get('x-forwarded-proto')) || request.nextUrl.protocol.replace(':', '') || 'http';
}

function shouldIncludeResponseBody(method: string, status: number): boolean {
  if (method === 'HEAD') {
    return false;
  }

  return ![204, 205, 304].includes(status);
}

async function getRequestBody(request: NextRequest): Promise<BodyInit | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

export async function proxySuperAdminRequest(request: NextRequest, upstreamPath: string): Promise<Response> {
  try {
    const upstreamUrl = new URL(upstreamPath, getSuperAdminApiBaseUrl());
    upstreamUrl.search = request.nextUrl.search;

    const headers = new Headers(request.headers);
    headers.set('x-forwarded-host', getForwardedHost(request));
    headers.set('x-forwarded-proto', getForwardedProto(request));
    for (const header of HOP_BY_HOP_HEADERS) {
      headers.delete(header);
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: await getRequestBody(request),
      cache: 'no-store',
      redirect: 'manual',
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete('content-length');

    const responseBody = shouldIncludeResponseBody(request.method, upstreamResponse.status)
      ? await upstreamResponse.arrayBuffer()
      : null;

    return new Response(responseBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Super Admin proxy request failed', {
      method: request.method,
      upstreamPath,
      upstreamBaseUrl: getSuperAdminApiBaseUrl(),
      error,
    });
    return Response.json({ message: 'Super Admin API unavailable' }, { status: 502 });
  }
}
