#!/usr/bin/env bash
# Site development helper: build / preview, and headless screenshots of the
# built site for visual review (the browser cache and the shots are gitignored).
# usage: scripts/shot.sh build
#        scripts/shot.sh preview [port]
#        scripts/shot.sh install
#        scripts/shot.sh shot <url> <out.png> [width]
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
export PLAYWRIGHT_BROWSERS_PATH="$here/.pw-browsers"
mkdir -p "$here/.shots"
cd "$here"
case "${1:-}" in
  build)
    npm run build 2>&1 | grep -E 'error|Error|warn|page\(s\) built' || true
    ;;
  preview)
    npx astro preview --port "${2:-4321}"
    ;;
  install)
    npx -y playwright@1.58.0 install chromium-headless-shell 2>&1 | grep -iE 'downloading|failed|error' || true
    echo "installed"
    ;;
  shot)
    url="$2"; out="$here/.shots/$3"; w="${4:-1440}"
    npx -y playwright@1.58.0 screenshot --full-page --viewport-size="${w},900" --wait-for-timeout=2500 "$url" "$out" 2>&1 | grep -iE 'error' || true
    ls -la "$out" | awk '{print $5, $9}'
    ;;
  *) echo "usage: $0 install | shot <url> <out> [width]"; exit 2 ;;
esac
