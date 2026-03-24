#!/bin/bash
set -euo pipefail

DB_HOST="${DB_HOST:-mssql}"
DB_PORT="${DB_PORT:-1433}"
DB_NAME="${DB_NAME:-StingraysHRMS}"
DB_USER="${DB_USER:-sa}"
DB_PASSWORD="${DB_PASSWORD:-Kanishka#9810}"
SCRIPT_DIR="${SCRIPT_DIR:-/scripts}"
AUTH_SEED_EMAIL="${AUTH_SEED_EMAIL:-admin@stingrays.com}"
AUTH_SEED_PASSWORD="${AUTH_SEED_PASSWORD:-Admin@123}"
AUTH_SEED_NAME="${AUTH_SEED_NAME:-Platform Administrator}"
SUPER_ADMIN_SEED_EMAIL="${SUPER_ADMIN_SEED_EMAIL:-superadmin@fusionlabz.lk}"
SUPER_ADMIN_SEED_PASSWORD="${SUPER_ADMIN_SEED_PASSWORD:-SuperAdmin@123}"
SUPER_ADMIN_SEED_NAME="${SUPER_ADMIN_SEED_NAME:-FusionLabz Platform Super Admin}"

SQLCMD="/opt/mssql-tools18/bin/sqlcmd"
if [ ! -x "$SQLCMD" ]; then
    SQLCMD="/opt/mssql-tools/bin/sqlcmd"
fi

if [ ! -x "$SQLCMD" ]; then
    echo "ERROR: sqlcmd was not found in the container image"
    exit 1
fi

if ! command -v htpasswd >/dev/null 2>&1; then
    echo "ERROR: htpasswd was not found in the container image"
    exit 1
fi

sql_escape() {
    printf "%s" "$1" | sed "s/'/''/g"
}

bcrypt_hash() {
    local hash
    hash="$(htpasswd -bnBC 12 seed "$1" | tr -d '\r\n' | cut -d: -f2-)"
    printf '%s' "${hash/#\$2y\$/\$2b\$}"
}

AUTH_SEED_PASSWORD_HASH="$(bcrypt_hash "$AUTH_SEED_PASSWORD")"
SUPER_ADMIN_SEED_PASSWORD_HASH="$(bcrypt_hash "$SUPER_ADMIN_SEED_PASSWORD")"

scripts=(
    "init.sql"
    "onboarding-schema.sql"
    "payroll-schema.sql"
    "super-admin-schema.sql"
    "add-prospects-table.sql"
    "add-onboarding-settings.sql"
    "add-onboarding-document-types.sql"
    "seed.sql"
)

echo "=== Starting database initialization ==="
echo "Waiting for SQL Server at ${DB_HOST}:${DB_PORT}..."

sqlcmd_common=(
    "$SQLCMD"
    -S "${DB_HOST},${DB_PORT}"
    -U "$DB_USER"
    -P "$DB_PASSWORD"
    -C
)

sqlcmd_vars=(
    -v
    "DB_NAME=${DB_NAME}"
    "AUTH_SEED_EMAIL=$(sql_escape "$AUTH_SEED_EMAIL")"
    "AUTH_SEED_NAME=$(sql_escape "$AUTH_SEED_NAME")"
    "AUTH_SEED_PASSWORD_HASH=${AUTH_SEED_PASSWORD_HASH}"
    "SUPER_ADMIN_SEED_EMAIL=$(sql_escape "$SUPER_ADMIN_SEED_EMAIL")"
    "SUPER_ADMIN_SEED_NAME=$(sql_escape "$SUPER_ADMIN_SEED_NAME")"
    "SUPER_ADMIN_SEED_PASSWORD_HASH=${SUPER_ADMIN_SEED_PASSWORD_HASH}"
)

for i in $(seq 1 60); do
    if "${sqlcmd_common[@]}" -Q "SELECT 1" >/dev/null 2>&1; then
        echo "SQL Server is ready"
        break
    fi

    if [ "$i" -eq 60 ]; then
        echo "ERROR: Failed to connect to SQL Server after 120 seconds"
        exit 1
    fi

    echo "Waiting for SQL Server... (${i}/60)"
    sleep 2
done

for script_name in "${scripts[@]}"; do
    script_path="${SCRIPT_DIR}/${script_name}"

    if [ ! -f "$script_path" ]; then
        echo "Skipping missing script: ${script_name}"
        continue
    fi

    echo "Running ${script_name}..."
    "${sqlcmd_common[@]}" "${sqlcmd_vars[@]}" -i "$script_path" -b -l 30
done

echo "=== Initialization complete ==="
echo "Verifying database creation..."
"${sqlcmd_common[@]}" -Q "SET NOCOUNT ON; SELECT name FROM sys.databases WHERE name = N'${DB_NAME}'"
