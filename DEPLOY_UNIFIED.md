# Unified Deployment

This project now deploys as two application services:

- `frontend`: one Next.js application serving portal, HRMS, onboarding, payroll, and super admin routes from a single domain
- `backend`: one Express API serving auth, HRMS user management, onboarding, payroll, and super admin APIs

## 1. Prepare environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

- `APP_FRONTEND_PORT`
- `APP_BACKEND_PORT`
- `MSSQL_PORT`
- `NEXT_PUBLIC_APP_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `PASETO_SECRET`
- `SUPER_ADMIN_PASETO_SECRET`

Optional seed values:

- `AUTH_SEED_EMAIL`
- `AUTH_SEED_PASSWORD`
- `AUTH_SEED_NAME`
- `SUPER_ADMIN_SEED_EMAIL`
- `SUPER_ADMIN_SEED_PASSWORD`
- `SUPER_ADMIN_SEED_NAME`

## 2. Build and run

Build and start the database stack first:

```bash
docker compose -f docker-compose.db.yml up -d --build
```

This creates:

- `mssql`: SQL Server 2022 with a persisted `mssql_data` volume
- `db-init`: a one-shot initializer image that creates `StingraysHRMS`, applies the SQL schema scripts, and seeds the admin and super-admin accounts plus baseline onboarding/import data

Wait for the seed container to finish successfully:

```bash
docker compose -f docker-compose.db.yml logs -f db-init
```

Then start the application stack from the repo root:

```bash
docker compose up -d --build
```

If you prefer a single command, you can also bring both stacks up together:

```bash
docker compose -f docker-compose.yml -f docker-compose.db.yml up -d --build
```

With the default `.env.example` values, this binds:

- SQL Server to `127.0.0.1:1433`
- frontend to `127.0.0.1:3000`
- backend to `127.0.0.1:4000`

The backend upload directory is persisted in the `onboarding_uploads` volume. The database files are persisted in the `mssql_data` volume.

Default seeded credentials:

- admin: `admin@stingrays.com` / `Admin@123`
- super admin: `superadmin@fusionlabz.lk` / `SuperAdmin@123`

For a non-Docker verification on a server or workstation, install once at the repo root and build both workspaces:

```bash
npm install
npm run build:backend
npm run build:frontend
```

## 3. Nginx

Install the config in [proxy/stingrays-hrms-unified.conf](/d:/Dev/Projects/collab/Stingrays_HRMS/proxy/stingrays-hrms-unified.conf), update `server_name`, then enable it in Nginx.

Recommended pattern:

- route `/api/*` and `/uploads/*` to the backend
- route everything else to the frontend

After placing the config:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4. TLS

Attach your TLS certificate using your normal Nginx SSL setup. If you use Certbot, add the certificate directives after validation and keep the same upstream routing.

## 5. Operational notes

- The frontend uses same-origin `/api/*` requests in production.
- The backend trusts proxy headers and sets auth cookies from the public host seen through Nginx.
- Keep `DB_HOST=mssql` in `.env` when the backend runs inside Docker Compose. If you run the backend directly on the host against the mapped SQL Server port, use `DB_HOST=127.0.0.1` instead.
- The DB init image uses `sqlcmd` with a deterministic script order and seeds admin/super-admin users before the app stack comes up.
