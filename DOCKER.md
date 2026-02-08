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

## Summary

| Command | Effect |
|--------|--------|
| `docker compose -f docker-compose.db.yml up -d` | Start DB only (create network + mssql + mssql-init) |
| `docker compose build` | Build only app images (no DB) |
| `docker compose up` | Start app (requires DB stack already running) |
| `docker compose -f docker-compose.db.yml -f docker-compose.yml up -d` | Start DB + app together |
