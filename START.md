# Getting Stingrays HRMS running on this machine

Login will work only if **both** the database and the **auth service** are running. Use these steps so this machine matches the one where it worked.

## 1. Start the database (first time or after reboot)

From the project root:

```bash
docker compose -f docker-compose.db.yml up -d
```

Wait until the database is ready (about 1–2 minutes). Optional check:

```bash
docker compose -f docker-compose.db.yml ps
```

When `stingrays-mssql` is **healthy** and `stingrays-mssql-init` has **exited (0)**, the DB and schema are ready.

## 2. Start the app stack (including auth service)

```bash
docker compose up -d
```

Or to build and start:

```bash
docker compose build && docker compose up -d
```

## 3. Check that the auth service is running

```bash
docker compose ps
```

You should see `auth-service` with port **4001** and status **Up**.

Quick test that login can reach the auth service:

- **PowerShell:** `Invoke-WebRequest -Uri http://localhost:4001 -UseBasicParsing | Select-Object StatusCode`
- **Browser:** open `http://localhost:4001` (you may see a blank page or 404; that’s OK as long as it doesn’t say “can’t connect”)
- **curl:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:4001`

## 4. Open the app and sign in

- App: **http://localhost:3000**
- Sign in with your admin account (e.g. after a password reset: `admin@stingrays.com` / `Admin@123`).

---

**If you only run `docker compose up`** and never run `docker-compose.db.yml`, the database and `hrms-db` network won’t exist. The auth service needs that DB, so login will fail. Always start the DB stack first, then the app stack.

---

### “Found orphan containers (stingrays-mssql…)” warning

This is **expected** when you use two compose files. The database runs from `docker-compose.db.yml`, so when you run the main `docker compose up`, those DB containers are not in that file and Compose reports them as orphans. **Do not use `--remove-orphans`** or you will remove the database. You can ignore the warning.
