import cors from "cors";
import type { Request, RequestHandler } from "express";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function getPrimaryHeaderValue(value: string | undefined | null): string | null {
  const [firstValue] = (value || "").split(",");
  const normalizedValue = firstValue?.trim().toLowerCase();
  return normalizedValue || null;
}

function normalizeProto(value: string | undefined | null): string | null {
  const normalizedValue = getPrimaryHeaderValue(value)?.replace(/:$/, "");
  if (normalizedValue === "http" || normalizedValue === "https") {
    return normalizedValue;
  }

  return null;
}

function normalizeOrigin(origin: string | undefined | null): string | null {
  if (!origin) {
    return null;
  }

  try {
    const parsedOrigin = new URL(origin.trim());
    if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") {
      return null;
    }

    return `${parsedOrigin.protocol}//${parsedOrigin.host}`.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeAuthority(value: string | undefined | null): string | null {
  const authority = getPrimaryHeaderValue(value);
  if (!authority) {
    return null;
  }

  try {
    return new URL(`http://${authority}`).host.toLowerCase();
  } catch {
    return authority;
  }
}

function getHostnameFromAuthority(authority: string): string {
  try {
    return new URL(`http://${authority}`).hostname.toLowerCase();
  } catch {
    return authority.split(":")[0]?.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
  }
}

function addLoopbackOriginAliases(origins: Set<string>, origin: string) {
  const parsedOrigin = new URL(origin);
  const hostname = parsedOrigin.hostname.toLowerCase();

  if (!LOOPBACK_HOSTS.has(hostname)) {
    return;
  }

  const port = parsedOrigin.port ? `:${parsedOrigin.port}` : "";
  for (const alias of ["localhost", "127.0.0.1", "[::1]"]) {
    origins.add(`${parsedOrigin.protocol}//${alias}${port}`.toLowerCase());
  }
}

function buildConfiguredOrigins(): Set<string> {
  const origins = new Set<string>();
  const configuredValues = [
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.FRONTEND_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .flatMap((value) => (value || "").split(","))
    .map((value) => normalizeOrigin(value))
    .filter((value): value is string => Boolean(value));

  for (const configuredOrigin of configuredValues) {
    origins.add(configuredOrigin);
    addLoopbackOriginAliases(origins, configuredOrigin);
  }

  return origins;
}

function buildRequestOrigins(req: Request): Set<string> {
  const origins = new Set<string>();
  const requestProto = normalizeProto(req.header("x-forwarded-proto")) || normalizeProto(req.protocol) || "http";

  for (const authorityHeader of [req.header("x-forwarded-host"), req.header("host")]) {
    const authority = normalizeAuthority(authorityHeader);
    if (!authority) {
      continue;
    }

    const origin = `${requestProto}://${authority}`.toLowerCase();
    origins.add(origin);

    if (LOOPBACK_HOSTS.has(getHostnameFromAuthority(authority))) {
      addLoopbackOriginAliases(origins, origin);
    }
  }

  return origins;
}

export function isAllowedCorsOrigin(
  req: Request,
  origin: string | undefined | null,
  configuredOrigins = buildConfiguredOrigins(),
): boolean {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  if (configuredOrigins.has(normalizedOrigin)) {
    return true;
  }

  return buildRequestOrigins(req).has(normalizedOrigin);
}

export function createCorsMiddleware(): RequestHandler {
  const configuredOrigins = buildConfiguredOrigins();

  return (req, res, next) => {
    cors({
      credentials: true,
      optionsSuccessStatus: 204,
      origin(origin, callback) {
        if (isAllowedCorsOrigin(req, origin, configuredOrigins)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
    })(req, res, next);
  };
}
