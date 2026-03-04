#!/usr/bin/env bash
# AG&W Website — Local Preview Server
# Usage: ./serve.sh [port]

PORT="${1:-8080}"
DIR="$(cd "$(dirname "$0")/src" && pwd)"

echo ""
echo "  ⬡ AG&W Inc. — Local Preview"
echo "  → http://localhost:${PORT}"
echo "  → Serving from: ${DIR}"
echo "  → Ctrl+C to stop"
echo ""

# Try python3 first, fall back to python
if command -v python3 &>/dev/null; then
  python3 -m http.server "$PORT" --directory "$DIR"
elif command -v python &>/dev/null; then
  cd "$DIR" && python -m SimpleHTTPServer "$PORT"
else
  echo "  ✗ Python not found. Install Python or try: npx serve src"
  exit 1
fi
