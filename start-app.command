#!/bin/bash
# Double-click to start Nani Bachat for local testing on a phone (Expo Go).
# Starts the local backend (SQLite, never the live database) and Expo.
# Close this window or press Ctrl+C to stop both.

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=8765
METRO_PORT=8081

# The Mac's LAN IP, so the phone can reach the backend (same WiFi needed).
IP="$(ipconfig getifaddr en0 || ipconfig getifaddr en1)"
if [ -z "$IP" ]; then
  echo "Could not find a WiFi IP. Connect this Mac to WiFi and try again."
  read -n 1 -s -r -p "Press any key to close"
  exit 1
fi

# Free the ports if an old run is still using them.
for PORT in $BACKEND_PORT $METRO_PORT; do
  PIDS="$(lsof -ti tcp:$PORT -sTCP:LISTEN)"
  [ -n "$PIDS" ] && kill $PIDS 2>/dev/null
done
sleep 1

# Backend: local SQLite database only (overrides DATABASE_URL from .env).
cd "$ROOT/backend" || exit 1
export DATABASE_URL="sqlite:///$ROOT/backend/db.sqlite3"
./venv/bin/python manage.py migrate --noinput >/dev/null 2>&1
./venv/bin/python manage.py runserver 0.0.0.0:$BACKEND_PORT >/tmp/nani-bachat-backend.log 2>&1 &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null' EXIT

echo "Backend running at http://$IP:$BACKEND_PORT (log: /tmp/nani-bachat-backend.log)"
echo "Scan the QR code below with Expo Go (Android) or the Camera app (iPhone)."
echo

# Frontend: Expo pointed at the backend above.
cd "$ROOT/mobile" || exit 1
EXPO_PUBLIC_API_URL="http://$IP:$BACKEND_PORT/api" npx expo start --clear
