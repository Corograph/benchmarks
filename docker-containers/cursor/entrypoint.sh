#!/usr/bin/env bash
# bench-cursor entrypoint: bridge on in-container loopback (its own security
# stance — 0.0.0.0 refused without an unexposed option) + a socat relay on
# 0.0.0.0:7790 that docker publishes to HOST loopback only. The ready line
# rides container stderr (docker logs) for the driver to parse.
set -euo pipefail
/bridge/bin/cursor-sdk-bridge --workspace /bench/repo --state-root /tmp/cursor-state --verbose &
BRIDGE_PID=$!
# wait for the listener before opening the relay
for i in $(seq 1 50); do
  if socat -u OPEN:/dev/null TCP:127.0.0.1:7788,connect-timeout=1 2>/dev/null; then break; fi
  sleep 0.2
done
exec socat TCP-LISTEN:7790,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:7788
