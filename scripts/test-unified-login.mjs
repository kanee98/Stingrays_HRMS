import assert from 'node:assert/strict';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://127.0.0.1:3000';
const TENANT_ADMIN_EMAIL = process.env.AUTH_SEED_EMAIL || 'admin@stingrays.com';
const TENANT_ADMIN_PASSWORD = process.env.AUTH_SEED_PASSWORD || 'Admin@123';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_SEED_EMAIL || 'superadmin@fusionlabz.lk';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_SEED_PASSWORD || 'SuperAdmin@123';

function getBrowserHeaders(pathname) {
  return {
    origin: APP_BASE_URL,
    referer: new URL(pathname, APP_BASE_URL).toString(),
  };
}

function getLoopbackAliasBaseUrl() {
  const currentUrl = new URL(APP_BASE_URL);

  if (currentUrl.hostname === '127.0.0.1') {
    currentUrl.hostname = 'localhost';
    return currentUrl.toString().replace(/\/$/, '');
  }

  if (currentUrl.hostname === 'localhost') {
    currentUrl.hostname = '127.0.0.1';
    return currentUrl.toString().replace(/\/$/, '');
  }

  return null;
}

function getCookieHeader(cookieJar) {
  const pairs = [];

  for (const [name, value] of cookieJar.entries()) {
    pairs.push(`${name}=${value}`);
  }

  return pairs.join('; ');
}

function getSetCookieHeaders(headers) {
  const responseHeaders = headers;

  if (typeof responseHeaders.getSetCookie === 'function') {
    return responseHeaders.getSetCookie();
  }

  const header = headers.get('set-cookie');
  return header ? [header] : [];
}

function mergeCookies(cookieJar, headers) {
  for (const header of getSetCookieHeaders(headers)) {
    const firstSegment = header.split(';', 1)[0];
    const separatorIndex = firstSegment.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const name = firstSegment.slice(0, separatorIndex).trim();
    const value = firstSegment.slice(separatorIndex + 1).trim();

    if (!name) {
      continue;
    }

    cookieJar.set(name, value);
  }
}

async function request(pathname, options = {}, cookieJar = new Map()) {
  const headers = new Headers(options.headers || {});
  const cookieHeader = getCookieHeader(cookieJar);

  if (!headers.has('origin')) {
    headers.set('origin', APP_BASE_URL);
  }

  if (!headers.has('referer')) {
    headers.set('referer', new URL(pathname, APP_BASE_URL).toString());
  }

  if (cookieHeader && !headers.has('cookie')) {
    headers.set('cookie', cookieHeader);
  }

  const response = await fetch(new URL(pathname, APP_BASE_URL), {
    ...options,
    headers,
    redirect: 'manual',
  });

  mergeCookies(cookieJar, response.headers);
  return response;
}

async function requestToBaseUrl(baseUrl, pathname, options = {}, cookieJar = new Map()) {
  const headers = new Headers(options.headers || {});
  const cookieHeader = getCookieHeader(cookieJar);

  if (!headers.has('origin')) {
    headers.set('origin', baseUrl);
  }

  if (!headers.has('referer')) {
    headers.set('referer', new URL(pathname, baseUrl).toString());
  }

  if (cookieHeader && !headers.has('cookie')) {
    headers.set('cookie', cookieHeader);
  }

  const response = await fetch(new URL(pathname, baseUrl), {
    ...options,
    headers,
    redirect: 'manual',
  });

  mergeCookies(cookieJar, response.headers);
  return response;
}

async function readJson(response) {
  const text = await response.text();

  try {
    return {
      text,
      json: JSON.parse(text),
    };
  } catch {
    return {
      text,
      json: null,
    };
  }
}

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await runCase('frontend health endpoint reports healthy backend connectivity', async () => {
  const response = await request('/health');
  const payload = await readJson(response);

  assert.equal(response.status, 200, payload.text);
  assert.equal(payload.json?.status, 'ok', payload.text);
  assert.equal(payload.json?.frontend?.status, 'ok', payload.text);
  assert.equal(payload.json?.backend?.status, 'ok', payload.text);
});

await runCase('tenant admin login establishes a session and can access protected user APIs', async () => {
  const cookieJar = new Map();

  const loginResponse = await request(
    '/api/auth/login',
    {
      method: 'POST',
      headers: {
        ...getBrowserHeaders('/login'),
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: TENANT_ADMIN_EMAIL,
        password: TENANT_ADMIN_PASSWORD,
      }),
    },
    cookieJar,
  );
  const loginPayload = await readJson(loginResponse);

  assert.equal(loginResponse.status, 200, loginPayload.text);
  assert.equal(loginPayload.json?.user?.email, TENANT_ADMIN_EMAIL, loginPayload.text);
  assert.ok(cookieJar.size > 0, 'expected auth cookies to be set after tenant admin login');

  const sessionResponse = await request('/api/auth/session', { headers: { accept: 'application/json' } }, cookieJar);
  const sessionPayload = await readJson(sessionResponse);

  assert.equal(sessionResponse.status, 200, sessionPayload.text);
  assert.equal(sessionPayload.json?.user?.email, TENANT_ADMIN_EMAIL, sessionPayload.text);

  const usersResponse = await request('/api/users', { headers: { accept: 'application/json' } }, cookieJar);
  const usersPayload = await readJson(usersResponse);

  assert.equal(usersResponse.status, 200, usersPayload.text);
  assert.ok(Array.isArray(usersPayload.json), usersPayload.text);
  assert.ok(
    usersPayload.json.some((user) => user?.Email === TENANT_ADMIN_EMAIL || user?.email === TENANT_ADMIN_EMAIL),
    usersPayload.text,
  );
});

await runCase('tenant auth accepts the newest valid cookie when stale duplicates exist', async () => {
  const cookieJar = new Map();

  const loginResponse = await request(
    '/api/auth/login',
    {
      method: 'POST',
      headers: {
        ...getBrowserHeaders('/login'),
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: TENANT_ADMIN_EMAIL,
        password: TENANT_ADMIN_PASSWORD,
      }),
    },
    cookieJar,
  );
  const loginPayload = await readJson(loginResponse);

  assert.equal(loginResponse.status, 200, loginPayload.text);
  const validSessionToken = cookieJar.get('stingrays_hrms_session');
  assert.ok(validSessionToken, 'expected tenant session cookie to be present after login');

  const sessionResponse = await request('/api/auth/session', {
    headers: {
      ...getBrowserHeaders('/dashboard'),
      accept: 'application/json',
      cookie: `stingrays_hrms_session=stale.invalid.token; stingrays_hrms_session=${validSessionToken}`,
    },
  });
  const sessionPayload = await readJson(sessionResponse);

  assert.equal(sessionResponse.status, 200, sessionPayload.text);
  assert.equal(sessionPayload.json?.user?.email, TENANT_ADMIN_EMAIL, sessionPayload.text);
});

await runCase('super admin login reaches the dashboard overview through the unified backend', async () => {
  const cookieJar = new Map();

  const loginResponse = await request(
    '/api/admin/auth/login',
    {
      method: 'POST',
      headers: {
        ...getBrowserHeaders('/admin/login'),
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
      }),
    },
    cookieJar,
  );
  const loginPayload = await readJson(loginResponse);

  assert.equal(loginResponse.status, 200, loginPayload.text);
  assert.equal(loginPayload.json?.user?.email, SUPER_ADMIN_EMAIL, loginPayload.text);
  assert.ok(cookieJar.size > 0, 'expected auth cookies to be set after super admin login');

  const sessionResponse = await request('/api/admin/auth/session', { headers: { accept: 'application/json' } }, cookieJar);
  const sessionPayload = await readJson(sessionResponse);

  assert.equal(sessionResponse.status, 200, sessionPayload.text);
  assert.equal(sessionPayload.json?.user?.email, SUPER_ADMIN_EMAIL, sessionPayload.text);

  const dashboardResponse = await request('/api/admin/dashboard/overview', { headers: { accept: 'application/json' } }, cookieJar);
  const dashboardPayload = await readJson(dashboardResponse);

  assert.equal(dashboardResponse.status, 200, dashboardPayload.text);
  assert.ok(dashboardPayload.json?.summary, dashboardPayload.text);
});

await runCase('super admin auth accepts the newest valid cookie when stale duplicates exist', async () => {
  const cookieJar = new Map();

  const loginResponse = await request(
    '/api/admin/auth/login',
    {
      method: 'POST',
      headers: {
        ...getBrowserHeaders('/admin/login'),
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
      }),
    },
    cookieJar,
  );
  const loginPayload = await readJson(loginResponse);

  assert.equal(loginResponse.status, 200, loginPayload.text);
  const validSessionToken = cookieJar.get('stingrays_super_admin_session');
  assert.ok(validSessionToken, 'expected super admin session cookie to be present after login');

  const sessionResponse = await request('/api/admin/auth/session', {
    headers: {
      ...getBrowserHeaders('/admin'),
      accept: 'application/json',
      cookie: `stingrays_super_admin_session=stale.invalid.token; stingrays_super_admin_session=${validSessionToken}`,
    },
  });
  const sessionPayload = await readJson(sessionResponse);

  assert.equal(sessionResponse.status, 200, sessionPayload.text);
  assert.equal(sessionPayload.json?.user?.email, SUPER_ADMIN_EMAIL, sessionPayload.text);
});

await runCase('tenant and super admin sessions coexist on the same browser session jar', async () => {
  const cookieJar = new Map();

  const tenantLoginResponse = await request(
    '/api/auth/login',
    {
      method: 'POST',
      headers: {
        ...getBrowserHeaders('/login'),
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: TENANT_ADMIN_EMAIL,
        password: TENANT_ADMIN_PASSWORD,
      }),
    },
    cookieJar,
  );
  const tenantLoginPayload = await readJson(tenantLoginResponse);
  assert.equal(tenantLoginResponse.status, 200, tenantLoginPayload.text);

  const adminLoginResponse = await request(
    '/api/admin/auth/login',
    {
      method: 'POST',
      headers: {
        ...getBrowserHeaders('/admin/login'),
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
      }),
    },
    cookieJar,
  );
  const adminLoginPayload = await readJson(adminLoginResponse);
  assert.equal(adminLoginResponse.status, 200, adminLoginPayload.text);

  const tenantSessionResponse = await request('/api/auth/session', { headers: { accept: 'application/json' } }, cookieJar);
  const tenantSessionPayload = await readJson(tenantSessionResponse);
  assert.equal(tenantSessionResponse.status, 200, tenantSessionPayload.text);
  assert.equal(tenantSessionPayload.json?.user?.email, TENANT_ADMIN_EMAIL, tenantSessionPayload.text);

  const adminSessionResponse = await request('/api/admin/auth/session', { headers: { accept: 'application/json' } }, cookieJar);
  const adminSessionPayload = await readJson(adminSessionResponse);
  assert.equal(adminSessionResponse.status, 200, adminSessionPayload.text);
  assert.equal(adminSessionPayload.json?.user?.email, SUPER_ADMIN_EMAIL, adminSessionPayload.text);
});

const loopbackAliasBaseUrl = getLoopbackAliasBaseUrl();

if (loopbackAliasBaseUrl) {
  await runCase(`alternate loopback alias ${loopbackAliasBaseUrl} supports tenant auth`, async () => {
    const cookieJar = new Map();

    const loginResponse = await requestToBaseUrl(
      loopbackAliasBaseUrl,
      '/api/auth/login',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: TENANT_ADMIN_EMAIL,
          password: TENANT_ADMIN_PASSWORD,
        }),
      },
      cookieJar,
    );
    const loginPayload = await readJson(loginResponse);

    assert.equal(loginResponse.status, 200, loginPayload.text);

    const sessionResponse = await requestToBaseUrl(
      loopbackAliasBaseUrl,
      '/api/auth/session',
      { headers: { accept: 'application/json' } },
      cookieJar,
    );
    const sessionPayload = await readJson(sessionResponse);

    assert.equal(sessionResponse.status, 200, sessionPayload.text);
    assert.equal(sessionPayload.json?.user?.email, TENANT_ADMIN_EMAIL, sessionPayload.text);
  });

  await runCase(`alternate loopback alias ${loopbackAliasBaseUrl} supports super admin auth`, async () => {
    const cookieJar = new Map();

    const loginResponse = await requestToBaseUrl(
      loopbackAliasBaseUrl,
      '/api/admin/auth/login',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: SUPER_ADMIN_EMAIL,
          password: SUPER_ADMIN_PASSWORD,
        }),
      },
      cookieJar,
    );
    const loginPayload = await readJson(loginResponse);

    assert.equal(loginResponse.status, 200, loginPayload.text);

    const sessionResponse = await requestToBaseUrl(
      loopbackAliasBaseUrl,
      '/api/admin/auth/session',
      { headers: { accept: 'application/json' } },
      cookieJar,
    );
    const sessionPayload = await readJson(sessionResponse);

    assert.equal(sessionResponse.status, 200, sessionPayload.text);
    assert.equal(sessionPayload.json?.user?.email, SUPER_ADMIN_EMAIL, sessionPayload.text);
  });
}
