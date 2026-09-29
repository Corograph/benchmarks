#!/usr/bin/env bash
# build_images.sh — build all bench Docker images on THIS machine.
#
# Docker images live in the local daemon, NOT the Syncthing-synced filesystem —
# every machine that runs docker arms must build once. EVERY installer is
# PINNED (owner ruling 2026-09-27 — `latest` cost us the Epoch-4 vintage
# archaeology: ta-bench-data/docker-images/README.md). The indexer pins are the
# Epoch-4 vintage read from the archived 08-04 images; a new indexer version is
# an Epoch-5 event, edited in the arm's Dockerfile on purpose. Claude Code's
# version is the ONE axis that moves inside Epoch-4 (the 5.5-generation models
# need a newer CLI; patch drift is disclosed per cell, never pinned per patch):
#
# Usage:  ./scripts/build_images.sh                # base + all arms
#         ./scripts/build_images.sh cbm serena     # base + named arms only
#         CLAUDE_CODE_VERSION=2.1.283 ./scripts/build_images.sh cold   # override the CLI pin
#
# Archived vintages restore with `docker load -i <folder>/image.tar` — the
# loaded image keeps the id the store's cells pin; no rebuild reproduces one.
set -euo pipefail
cd "$(dirname "$0")/.."

ARMS=("$@")
if [ ${#ARMS[@]} -eq 0 ]; then
  # codex + cursor are SELF-CONTAINED (native-harness arms, not claude-shaped —
  # they do not build FROM bench-base); listed here so every machine builds
  # them alongside.
  # wave-2 external harnesses (design §5-§7; SCAFFOLD stage — their fetch
  # scripts fail loudly until each lane's recon fixes the artifact pin):
  # auggie (npm-pinned, no fetch) · devin (fetch-devin.sh) · prime-agent
  # (fetch-prime.sh, tarball identity = recon item)
  ARMS=(cold cbm graphify gitnexus codegraph serena repomix codex cursor auggie devin prime-agent)
fi

BASE_ARGS=()
if [ -n "${CLAUDE_CODE_VERSION:-}" ]; then
  BASE_ARGS=(--build-arg "CLAUDE_CODE_VERSION=${CLAUDE_CODE_VERSION}")
  echo "build: bench-base (claude-shaped arms build FROM this) — claude-code ${CLAUDE_CODE_VERSION} (override)"
else
  echo "build: bench-base (claude-shaped arms build FROM this) — claude-code at the Dockerfile pin"
fi
docker build ${BASE_ARGS[@]+"${BASE_ARGS[@]}"} -t bench-base:latest arms/base

for arm in "${ARMS[@]}"; do
  if [ ! -f "arms/$arm/Dockerfile" ]; then
    echo "SKIP  $arm — no arms/$arm/Dockerfile" >&2
    continue
  fi
  if [ "$arm" = "cursor" ]; then
    # cursor's build context needs the PINNED bridge staged first (docker
    # build never fetches the network — fetch-bridge.sh is the one
    # sanctioned downloader, idempotent, SHA256-verified every run)
    echo "stage: cursor-sdk-bridge (fetch-bridge.sh)"
    (cd arms/cursor && ./fetch-bridge.sh)
  fi
  if [ "$arm" = "devin" ]; then
    echo "stage: devin cli tarball (fetch-devin.sh)"
    (cd arms/devin && bash ./fetch-devin.sh)
  fi
  if [ "$arm" = "prime-agent" ]; then
    echo "stage: prime-agent tarball (fetch-prime.sh)"
    (cd arms/prime-agent && bash ./fetch-prime.sh) || { echo "SKIP  prime-agent — artifact pin pending (§7.5 recon)" >&2; continue; }
  fi
  echo "build: bench-$arm"
  docker build -t "bench-$arm:latest" "arms/$arm"
done

echo "done. images (with their pinned versions — the vintage is a label, never a guess):"
for img in $(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^bench-' | sort); do
  # `|| true`: an image with no bench labels (the native-harness arms) makes grep
  # exit 1, and under pipefail that would abort the whole summary silently
  labels=$(docker inspect --format '{{range $k,$v := .Config.Labels}}{{$k}}={{$v}} {{end}}' "$img" 2>/dev/null | tr ' ' '\n' | grep '^org\.truearchitect\.bench\.' | sed 's/org\.truearchitect\.bench\.//' | tr '\n' ' ' || true)
  printf '%-28s %s\n' "$img" "${labels:-(no version labels — predates the 2026-09-27 pins)}"
done
