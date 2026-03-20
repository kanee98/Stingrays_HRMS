import type { NextRequest } from 'next/server';

function getHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const [firstValue] = value.split(',');
  const normalizedValue = firstValue?.trim();
  return normalizedValue || null;
}

function getAuthServiceBaseUrl(): string {
  const url = process.env.AUTH_SERVICE_INTERNAL_URL || process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;
  if (!url) {
    throw new Error('AUTH service URL is not configured (set AUTH_SERVICE_INTERNAL_URL or NEXT_PUBLIC_AUTH_SERVICE_URL)');
  }
  return url;
}

function getForwardedHost(request: NextRequest): string {
  return getHeaderValue(request.headers.get('x-forwarded-host')) || request.headers.get('host') || request.nextUrl.host;
}

function getForwardedProto(request: NextRequest): string {
  return getHeaderValue(request.headers.get('x-forwarded-proto')) || request.nextUrl.protocol.replace(':', '') || 'http';
}

async function getRequestBody(request: NextRequest): Promise<BodyInit | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

export async function proxyAuthServiceRequest(request: NextRequest, upstreamPath: string): Promise<Response> {
  let upstreamUrl: URL;

  try {
    upstreamUrl = new URL(upstreamPath, getAuthServiceBaseUrl());
    upstreamUrl.search = request.nextUrl.search;

    const headers = new Headers(request.headers);
    headers.set('x-forwarded-host', getForwardedHost(request));
    headers.set('x-forwarded-proto', getForwardedProto(request));
    headers.delete('host');
    headers.delete('content-length');

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: await getRequestBody(request),
      cache: 'no-store',
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    upstreamResponse.headers.forEach((value, key) => {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === 'content-length' || normalizedKey === 'set-cookie') {
        return;
      }

      responseHeaders.set(key, value);
    });

    const setCookieHeaders = (upstreamResponse.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    if (setCookieHeaders.length > 0) {
      for (const setCookieHeader of setCookieHeaders) {
        responseHeaders.append('set-cookie', setCookieHeader);
      }
    } else {
      const setCookieHeader = upstreamResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        responseHeaders.append('set-cookie', setCookieHeader);
      }
    }

    const responseBody = request.method === 'HEAD' ? null : await upstreamResponse.arrayBuffer();

    return new Response(responseBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof AuthProxyConfigurationError) {
      console.error('[hrms-ui] Auth proxy misconfigured:', error.message);
      return Response.json({ message: 'Auth service is not configured' }, { status: 500 });
    }

    console.error('[hrms-ui] Auth proxy request failed:', {
      upstreamPath,
      upstreamUrl: upstreamUrl?.toString() ?? 'unresolved',
      method: request.method,
      error: getErrorDetails(error),
    });
    return Response.json({ message: 'Auth service unavailable' }, { status: AUTH_PROXY_ERROR_STATUS });
  }
}
