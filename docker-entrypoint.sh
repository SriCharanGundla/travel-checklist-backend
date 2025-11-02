#!/bin/sh
set -e

if [ "${SKIP_DB_MIGRATIONS}" != "true" ]; then
  echo "Running database migrations..."
  npx sequelize-cli db:migrate

  if [ "${RUN_DB_SEEDS}" = "true" ]; then
    echo "Seeding database..."
    npx sequelize-cli db:seed:all
  fi
fi

echo "Starting application..."
exec "$@"
