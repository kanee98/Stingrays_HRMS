# Getting Stingrays HRMS running on this machine

## Build note

If `docker compose build` fails on Docker Desktop with a BuildKit/Bake snapshot export error, keep `COMPOSE_BAKE=false` in the root `.env`. That forces Compose to use the non-Bake build path, which is more stable for this stack on Windows.

Login for the user-facing apps works only if the database and `auth-service` are running. The Super Admin console additionally requires `super-admin-api`.

## 1. Start the database

From the project root:

```bash
docker compose -f docker-compose.db.yml up -d
```

Wait until `stingrays-mssql` is healthy and `stingrays-mssql-init` exits successfully.

## 2. Build and start the app stack

```bash
docker compose build
docker compose up -d
```

## 3. Open the apps

- Portal: `http://localhost:3000`
- Employee Onboarding: `http://localhost:3001`
- HRMS: `http://localhost:3002`
- Payroll: `http://localhost:3010`
- Super Admin: `http://localhost:3020`

## 4. Sign in

- User portal credentials: `admin@stingrays.com / Admin@123`
- Super Admin credentials: `superadmin@fusionlabz.lk / SuperAdmin@123`

The portal at `http://localhost:3000` is now the default entry point. After sign-in, users choose which enabled system to enter. HRMS itself now runs on `http://localhost:3002`.

## Notes

- The Super Admin API bootstraps its schema and default seed data on startup, so existing databases are upgraded when the service starts.
- The database init stack also runs `init-sql/super-admin-schema.sql` for fresh environments.
- Ignore the `Found orphan containers` warning when using both compose files. Do not use `--remove-orphans` or you may remove the database containers.
