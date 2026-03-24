import type { CookieOptions, Request, Response } from "express";

export const AUTH_SESSION_COOKIE = "stingrays_hrms_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8;
const AUTH_SESSION_COOKIE_PATH = "/api";
const LEGACY_AUTH_SESSION_COOKIE_PATHS = ["/", AUTH_SESSION_COOKIE_PATH] as const;

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

function getCookieDomains(hostHeader: string | undefined): string[] {
  const domain = getCookieDomain(hostHeader);
  if (!domain) {
    return [];
  }

  const normalizedDomain = domain.startsWith(".") ? domain.slice(1) : domain;
  return Array.from(new Set([domain, normalizedDomain].filter(Boolean)));
}

function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.header("x-forwarded-proto");
  return req.secure || forwardedProto?.split(",")[0]?.trim() === "https";
}

function getBaseCookieOptions(req: Request, path = AUTH_SESSION_COOKIE_PATH): CookieOptions {
  return {
    httpOnly: true,
    path,
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}

function getCookieOptions(req: Request): CookieOptions {
  const domain = getCookieDomain(req.header("x-forwarded-host") || req.header("host"));

  return {
    ...getBaseCookieOptions(req, AUTH_SESSION_COOKIE_PATH),
    ...(domain ? { domain } : {}),
    maxAge: SESSION_MAX_AGE_MS,
  };
}

export function setSessionCookie(req: Request, res: Response, token: string) {
  clearSessionCookie(req, res);
  res.cookie(AUTH_SESSION_COOKIE, token, getCookieOptions(req));
}

export function clearSessionCookie(req: Request, res: Response) {
  const hostHeader = req.header("x-forwarded-host") || req.header("host");

  for (const path of LEGACY_AUTH_SESSION_COOKIE_PATHS) {
    // Clear both the current-host cookie and any shared-domain variants so a stale
    // cookie on either scope cannot silently re-authenticate the user.
    res.clearCookie(AUTH_SESSION_COOKIE, getBaseCookieOptions(req, path));

    for (const domain of getCookieDomains(hostHeader)) {
      res.clearCookie(AUTH_SESSION_COOKIE, {
        ...getBaseCookieOptions(req, path),
        domain,
      });
    }
  }
}

export function getSessionTokensFromRequest(req: Request): string[] {
  const tokens: string[] = [];
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice("Bearer ".length).trim();
    if (bearerToken) {
      tokens.push(bearerToken);
    }
  }

  const cookieHeader = req.header("cookie");
  if (cookieHeader) {
    const cookieTokens: string[] = [];

    for (const segment of cookieHeader.split(";")) {
      const [name, ...valueParts] = segment.trim().split("=");
      if (name === AUTH_SESSION_COOKIE) {
        const token = valueParts.join("=");
        if (token) {
          cookieTokens.push(decodeURIComponent(token));
        }
      }
    }

    tokens.push(...cookieTokens);
  }

  return Array.from(new Set(tokens.filter(Boolean)));
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const [token] = getSessionTokensFromRequest(req);
  return token ?? null;
}
