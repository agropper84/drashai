#!/usr/bin/env bash
# Run inside drashai-refactor/ BEFORE copying to your Next.js repo.
# Renames the parens-sanitized directories back to their real Next.js App Router names.

set -euo pipefail
cd "$(dirname "$0")/app"

# (app) route group
if [ -d "-app-" ] && [ ! -d "(app)" ]; then
  mv "-app-" "(app)"
  echo "✓ Renamed -app- → (app)"
fi

# [id] dynamic segment
cd "(app)/files" 2>/dev/null || { echo "Could not enter (app)/files"; exit 0; }
if [ -d "-id-" ] && [ ! -d "[id]" ]; then
  mv "-id-" "[id]"
  echo "✓ Renamed -id- → [id]"
fi

echo "Done. Folders are now ready to copy into your Next.js repo."
