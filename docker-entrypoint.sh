#!/bin/bash
set -e

# Use environment variables for database connection (with defaults)
DB_HOST="${DB_HOST:-db}"
DB_USER="${POSTGRES_USER:-mzansi}"
DB_NAME="${POSTGRES_DB:-mzansiserve}"

# Wait for database to be ready
echo "Waiting for database to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if pg_isready -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        echo "Database is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting for database... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "Warning: Database may not be ready, but continuing..."
fi

# Initialize Flask-Migrate if migrations/env.py doesn't exist
if [ ! -f "migrations/env.py" ]; then
    echo "Initializing Flask-Migrate..."
    set +e  # Temporarily disable exit on error for init command
    flask db init
    init_status=$?
    set -e  # Re-enable exit on error
    
    # If init failed because migrations already exists, try to continue
    if [ $init_status -ne 0 ]; then
        # Check if env.py exists now (init might have partially succeeded)
        if [ -f "migrations/env.py" ]; then
            echo "Flask-Migrate initialized (env.py found)"
        else
            echo "Warning: flask db init failed. Checking if migrations directory needs manual setup..."
            # If directory exists but is empty/incomplete, we'll try to initialize files manually
            # But since it's a volume mount, we can't remove it - just exit with error
            if [ -d "migrations" ]; then
                echo "Error: migrations directory exists but env.py is missing and init failed."
                echo "This may be due to an incomplete volume mount. Try removing the migrations volume:"
                echo "  docker volume rm mzansi-serve_migrations"
                exit 1
            else
                echo "Error: Failed to initialize migrations"
                exit 1
            fi
        fi
    else
        echo "Flask-Migrate initialized successfully"
    fi
else
    echo "Flask-Migrate already initialized"
fi

# Run database migrations to create / update all tables
echo "Running database migrations (flask db upgrade)..."
if flask db upgrade; then
    echo "Database migrations applied successfully."
else
    echo "ERROR: flask db upgrade failed."
    echo "Please check the migration history and ensure the database is in sync."
    echo "Fallback to db.create_all() is disabled to prevent data inconsistency."
    # If this is a fresh DB with no migrations table but existing tables, 
    # you might need to run 'flask db stamp head' manually.
    exit 1
fi

echo "Starting application..."

# ── Seed all default data + admin user (conditional) ──────────────────────
if [[ "$RUN_SEEDERS" == "true" ]]; then
    echo "Running flask seed-all (skips existing records to preserve user data)..."
    flask seed-all && echo "Seed complete." || echo "Warning: seed-all had errors (non-fatal, app will still start)"
else
    echo "Seeding skipped (RUN_SEEDERS is not 'true')."
fi

# Execute the command passed to docker-entrypoint
exec "$@"

