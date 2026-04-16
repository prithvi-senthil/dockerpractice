#!/bin/bash

# Database migration script
# This script applies the migrations to the database

set -e

echo "🔄 Applying database migrations..."

# Get database credentials from .env
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

# Use variables or defaults
DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD:-}
DB_NAME=${DB_NAME:-attendance_app}

echo "📊 Connecting to database: $DB_NAME at $DB_HOST"

# Apply migration
mysql -h "$DB_HOST" -u "$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} "$DB_NAME" < database/migrations/001-add-system-settings-and-audit-logs.sql

echo "✅ Migration completed successfully!"
echo ""
echo "📝 Changes applied:"
echo "  - Created system_settings table"
echo "  - Created audit_logs table"
echo "  - Inserted default configuration values"
echo ""
echo "🚀 You can now start the backend server with: npm start"
