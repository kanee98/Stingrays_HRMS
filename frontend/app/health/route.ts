import { BackendServiceConfigurationError, getBackendBaseUrls } from '@shared/lib/server/backendBaseUrl';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function GET(): Promise<Response> {
  try {
    let lastErrorStatus: number | null = null;

    for (const baseUrl of getBackendBaseUrls()) {
      try {
        const backendUrl = new URL('/health', baseUrl);
        const backendResponse = await fetch(backendUrl, {
          cache: 'no-store',
          redirect: 'manual',
        });

        if (!backendResponse.ok) {
          lastErrorStatus = backendResponse.status;
          continue;
        }

        const backendPayload = await backendResponse.json().catch(() => ({ status: 'ok' }));
        return Response.json({
          status: 'ok',
          frontend: { status: 'ok' },
          backend: backendPayload,
        });
      } catch (error) {
        console.error('[frontend] Backend health probe failed:', getErrorDetails(error));
      }
    }

    return Response.json(
      {
        status: 'degraded',
        frontend: { status: 'ok' },
        backend: lastErrorStatus ? { status: 'error', statusCode: lastErrorStatus } : { status: 'unavailable' },
      },
      { status: 502 },
    );
  } catch (error) {
    if (error instanceof BackendServiceConfigurationError) {
      return Response.json(
        {
          status: 'degraded',
          frontend: { status: 'ok' },
          backend: { status: 'misconfigured' },
        },
        { status: 500 },
      );
    }

    console.error('[frontend] Health check failed:', getErrorDetails(error));
    return Response.json(
      {
        status: 'degraded',
        frontend: { status: 'ok' },
        backend: { status: 'unavailable' },
      },
      { status: 502 },
    );
  }
}
