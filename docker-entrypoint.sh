#!/bin/sh
set -eu

is_web_command() {
  if [ "$#" -eq 0 ]; then
    return 0
  fi

  if [ "$1" = "web" ]; then
    return 0
  fi

  if [ "$1" = "node" ] && [ "${2:-}" = "server.js" ]; then
    return 0
  fi

  return 1
}

if is_web_command "$@"; then
  echo "Generating Prisma client with runtime environment..."
  npm run prisma:generate

  echo "Building Next.js app with runtime environment..."
  npm run build

  echo "Starting Shipyard HQ..."
  exec node .next/standalone/server.js
fi

exec "$@"
