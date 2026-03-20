# Docker setup

The database runs in a **separate compose file** so it is not rebuilt when you run `docker compose build`. Only the app services (UIs and APIs) are built from the main compose file.

## Files

- **`docker-compose.yml`** – App stack only: hrms-ui, payroll-ui, payroll-api, employee-ui, employee-api, auth-service. No database services.
- **`docker-compose.db.yml`** – Database stack: MSSQL and mssql-init (schema/init scripts). Uses a named network so the app can connect.

## Workflow

### 1. Start the database (once or when needed)

```bash
docker compose -f docker-compose.db.yml up -d
```

This creates the `stingrays-hrms-db` network and starts:

- **mssql** – SQL Server 2022 (data in `mssql_data` volume)
- **mssql-init** – runs init scripts after mssql is healthy

Data persists in the `mssql_data` volume. You only need to run this when the DB is not already running.

### 2. Build and run the app (no DB rebuild)

```bash
docker compose build
docker compose up
```

`docker compose build` only builds the app images (hrms-ui, payroll-ui, payroll-api, employee-ui, employee-api, auth-service). The database is not in this file, so it is never rebuilt.

Make sure the database stack is running first; otherwise `docker compose up` will fail with “network stingrays-hrms-db not found”.

### 3. Optional: run DB and app together

```bash
docker compose -f docker-compose.db.yml -f docker-compose.yml up -d
```

This starts both the database and the app. Using `docker compose build` without the DB file still only builds app images.

For the reverse-proxy deployment in `PROXY.md`, keep these production assumptions aligned with the compose ports:

- **`hrms.stingraysglobal.com`** should proxy to **`127.0.0.1:3002`** because `hrms-ui` publishes `3002:3000`.
- **`portal-ui`** stays on **`127.0.0.1:3000`**.
- **`AUTH_SERVICE_INTERNAL_URL`** for `hrms-ui` must stay on the Docker network URL **`http://auth-service:4000`** so server-side `/api/auth/*` requests do not fall back to `localhost` or the public auth hostname.

## If "Dockerfile not found" or build fails (DockerFile vs Dockerfile)

On Windows, the file can be saved or tracked as **DockerFile** (capital F). Docker and Git expect **Dockerfile** (lowercase f). Fix it once:

**Windows (PowerShell, from project root):**
```powershell
.\scripts\fix-dockerfile-casing.ps1
git add -A
git status
```
Then commit so Git tracks the correct name: `git commit -m "Fix Dockerfile casing"`

**Linux / Mac / Git Bash (from project root):**
```bash
chmod +x scripts/fix-dockerfile-casing.sh
./scripts/fix-dockerfile-casing.sh
git add -A
git status
```
Then commit. After that, `docker compose build` will find the Dockerfiles.

---

## If "Invalid object name 'Prospects'" when uploading Excel

The Prospects table is created by the onboarding schema. If the DB was initialized before that table was added, create it by running (from the project root, with the DB stack running):

```bash
docker compose -f docker-compose.db.yml run --rm mssql-init /opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P 'Kanishka#9810' -d StingraysHRMS -i /scripts/add-prospects-table.sql -C
```

Or run the full onboarding schema again (safe, only adds missing objects):

```bash
docker compose -f docker-compose.db.yml run --rm mssql-init /opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P 'Kanishka#9810' -d StingraysHRMS -i /scripts/onboarding-schema.sql -C
```

### Configurable onboarding (document types and step visibility)

If you need the configurable document types or optional Gramasevaka/Police Report steps, run (with the DB stack running):

```bash
docker compose -f docker-compose.db.yml run --rm mssql-init /opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P 'Kanishka#9810' -d StingraysHRMS -i /scripts/add-onboarding-document-types.sql -C
docker compose -f docker-compose.db.yml run --rm mssql-init /opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P 'Kanishka#9810' -d StingraysHRMS -i /scripts/add-onboarding-settings.sql -C
```

## Auth service (PASETO)

Login uses **PASETO** (v3.local) tokens instead of JWT. Set one of these for the auth-service:

- **`PASETO_SECRET`** – preferred; used as the secret for signing/verifying tokens.
- **`JWT_SECRET`** – fallback if `PASETO_SECRET` is not set (so existing env still works).

Use a long, random value in production (e.g. 32+ characters). The service derives a 32-byte key from it with SHA-256.

## Summary

| Command | Effect |
|--------|--------|
| `docker compose -f docker-compose.db.yml up -d` | Start DB only (create network + mssql + mssql-init) |
| `docker compose build` | Build only app images (no DB) |
| `docker compose up` | Start app (requires DB stack already running) |
| `docker compose -f docker-compose.db.yml -f docker-compose.yml up -d` | Start DB + app together |
