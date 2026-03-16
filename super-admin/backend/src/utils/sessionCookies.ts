import type { CookieOptions, Request, Response } from "express";

export const SUPER_ADMIN_SESSION_COOKIE = "stingrays_super_admin_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8;

const IPV4_HOSTNAME = /^(\d{1,3}\.){3}\d{1,3}$/;

function isIpAddress(hostname: string): boolean {
  return IPV4_HOSTNAME.test(hostname) || hostname.includes(":");
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "::1";
}

function normalizeHostname(hostHeader: string | undefined): string {
  const [forwardedHost] = (hostHeader || "").split(",");
  return (forwardedHost || "").split(":")[0].trim().toLowerCase();
}

function getCookieDomain(hostHeader: string | undefined): string | undefined {
  const hostname = normalizeHostname(hostHeader);

  if (!hostname || isLocalHostname(hostname) || isIpAddress(hostname)) {
    return undefined;
  }

  const parts = hostname.split(".").filter(Boolean);
  if (parts.length < 3) {
    return undefined;
  }

  return `.${parts.slice(1).join(".")}`;
}

function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.header("x-forwarded-proto");
  return req.secure || forwardedProto?.split(",")[0]?.trim() === "https";
}

function getCookieOptions(req: Request): CookieOptions {
  const domain = getCookieDomain(req.header("x-forwarded-host") || req.header("host"));

  return {
    domain,
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}

export function setSessionCookie(req: Request, res: Response, token: string) {
  res.cookie(SUPER_ADMIN_SESSION_COOKIE, token, getCookieOptions(req));
}

export function clearSessionCookie(req: Request, res: Response) {
  res.clearCookie(SUPER_ADMIN_SESSION_COOKIE, {
    ...getCookieOptions(req),
    expires: new Date(0),
    maxAge: undefined,
  });
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice("Bearer ".length).trim();
    return bearerToken || null;
  }

  const cookieHeader = req.header("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const segment of cookieHeader.split(";")) {
    const [name, ...valueParts] = segment.trim().split("=");
    if (name === SUPER_ADMIN_SESSION_COOKIE) {
      const token = valueParts.join("=");
      return token ? decodeURIComponent(token) : null;
    }
  }

  return null;
}
