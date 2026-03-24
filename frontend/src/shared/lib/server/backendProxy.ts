import type { NextRequest } from 'next/server';
import { BackendServiceConfigurationError, getBackendBaseUrls } from './backendBaseUrl';

const HOP_BY_HOP_HEADERS = new Set([
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
]);

const PROXY_ONLY_BROWSER_HEADERS = ['origin', 'referer', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest'];

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { value: String(error) };
}

function getHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const [firstValue] = value.split(',');
  const normalizedValue = firstValue?.trim();
  return normalizedValue || null;
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

function copyResponseHeaders(upstreamResponse: Response): Headers {
  const responseHeaders = new Headers();

  upstreamResponse.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey) || normalizedKey === 'set-cookie') {
      return;
    }

    responseHeaders.append(key, value);
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

  return responseHeaders;
}

export async function proxyBackendRequest(request: NextRequest, upstreamPath: string): Promise<Response> {
  let lastResolvedUrl: string | null = null;
  let lastError: unknown = null;

  try {
    const requestBody = await getRequestBody(request);

    for (const baseUrl of getBackendBaseUrls()) {
      const upstreamUrl = new URL(upstreamPath, baseUrl);
      upstreamUrl.search = request.nextUrl.search;
      lastResolvedUrl = upstreamUrl.toString();

      const headers = new Headers(request.headers);
      headers.set('x-forwarded-host', getForwardedHost(request));
      headers.set('x-forwarded-proto', getForwardedProto(request));
      for (const header of HOP_BY_HOP_HEADERS) {
        headers.delete(header);
      }
      for (const header of PROXY_ONLY_BROWSER_HEADERS) {
        headers.delete(header);
      }

      try {
        const upstreamResponse = await fetch(upstreamUrl, {
          method: request.method,
          headers,
          body: requestBody,
          cache: 'no-store',
          redirect: 'manual',
        });

        const responseBody = shouldIncludeResponseBody(request.method, upstreamResponse.status)
          ? await upstreamResponse.arrayBuffer()
          : null;

        return new Response(responseBody, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers: copyResponseHeaders(upstreamResponse),
        });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('Unable to reach the backend service');
  } catch (error) {
    if (error instanceof BackendServiceConfigurationError) {
      console.error('[frontend] Backend proxy misconfigured:', error.message);
      return Response.json({ message: 'Backend service is not configured' }, { status: 500 });
    }

    console.error('[frontend] Backend proxy request failed:', {
      upstreamPath,
      upstreamUrl: lastResolvedUrl ?? 'unresolved',
      method: request.method,
      error: getErrorDetails(error),
    });
    return Response.json({ message: 'Backend service unavailable' }, { status: 502 });
  }
}
