#!/usr/bin/env bash
# Stage the PINNED cursor-sdk-bridge archive into this build context, verified
# against the committed BRIDGE-SHA256SUMS (the pin law: docker build never
# fetches the network; this script is the one sanctioned downloader).
set -euo pipefail
cd "$(dirname "$0")"
VERSION="${BRIDGE_VERSION:-1.0.28}"
ARCH="${BRIDGE_ARCH:-arm64}"
F="cursor-sdk-bridge-standalone-linux-${ARCH}.tar.gz"
if [ ! -f "$F" ]; then
  # prefer the recon copy (already verified) over a fresh download
  RECON="../../design/cursor-recon/v${VERSION}/${F}"
  if [ -f "$RECON" ]; then
    cp "$RECON" "$F"
  else
    curl -sfLO "https://github.com/cursor/sdk-bridge/releases/download/v${VERSION}/${F}"
  fi
fi
grep "  ${F}\$" BRIDGE-SHA256SUMS | shasum -a 256 -c -
echo "staged + verified: ${F} (v${VERSION})"
