#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/../.."
cd "${ROOT_DIR}"

echo "Building sf-admin-tool..."
npm run build

echo "Starting sf-admin-tool server (logging to launcher/macos/server-output.txt)..."
npm run start >> "launcher/macos/server-output.txt" 2>&1 &
SERVER_PID=$!

sleep 3
open "http://127.0.0.1:4387"

echo "Server started (PID: ${SERVER_PID}). Logs: launcher/macos/server-output.txt"
echo "Press Ctrl+C to stop, or run launcher/macos/stop-tool.sh"

wait "${SERVER_PID}"
