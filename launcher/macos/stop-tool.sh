#!/usr/bin/env bash
set -euo pipefail

echo "Attempting to stop sf-admin-tool server on port 4387..."

# Find PIDs listening on port 4387 using lsof
PIDS=$(lsof -ti:4387 2>/dev/null || true)

if [ -z "${PIDS}" ]; then
  echo "No process found listening on port 4387."
  exit 0
fi

# Kill each PID found
for PID in ${PIDS}; do
  echo "Stopping PID ${PID}..."
  kill -9 "${PID}" 2>/dev/null || true
done

echo "Done. Server stopped."
