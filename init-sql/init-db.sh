#!/bin/bash

echo "=== Starting database initialization ==="
echo "Waiting for SQL Server to be ready..."

# Wait for SQL Server to be ready
for i in {1..60}; do
    if /opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P 'Kanishka#9810' -Q 'SELECT 1' -C > /dev/null 2>&1; then
        echo "SQL Server is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "ERROR: Failed to connect to SQL Server after 120 seconds"
        exit 1
    fi
    echo "Waiting for SQL Server... ($i/60)"
    sleep 2
done

echo "Running initialization script..."
/opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P 'Kanishka#9810' -i /scripts/init.sql -C -l 30

echo "Running onboarding schema script..."
/opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P 'Kanishka#9810' -i /scripts/onboarding-schema.sql -C -l 30

echo "Running payroll schema script..."
/opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P 'Kanishka#9810' -i /scripts/payroll-schema.sql -C -l 30

echo "Running super admin schema script..."
/opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P 'Kanishka#9810' -i /scripts/super-admin-schema.sql -C -l 30

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo "=== Initialization complete! ==="
    # Verify database was created
    echo "Verifying database creation..."
    /opt/mssql-tools18/bin/sqlcmd -S mssql -U sa -P 'Kanishka#9810' -Q "SELECT name FROM sys.databases WHERE name = 'StingraysHRMS'" -C
    exit 0
else
    echo "ERROR: Initialization script failed with exit code $EXIT_CODE"
    exit 1
fi
