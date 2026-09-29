# bench-cursor — the Cursor Agent lane (cursor-sdk-bridge, EXTERNAL-HARNESS-ARMS §3.8)
#
# The bridge archive is PINNED + SHA256-VERIFIED by fetch-bridge.sh BEFORE the
# build (never a network fetch inside docker build — the §0.2 pin law); the
# tarball sits in this build context (gitignored; BRIDGE-SHA256SUMS committed).
# manifest.json bakes into the image AND is recorded per cell as vintage.
#
# Runtime facts (recon-proven, design/cursor-recon/RECON.md): the binary runs on
# stock bookworm-slim; bridge binds per CURSOR_SDK_BRIDGE_HOST/PORT env; ready
# line on stderr; bearer token file under /tmp. Auth: CURSOR_API_KEY arrives
# env-at-spawn (never an image layer, never argv).
FROM debian:bookworm-slim

ARG BRIDGE_ARCH=arm64
ARG BRIDGE_VERSION=1.0.28

# proxy env scrubbed — egress is the bridge's own (allowlist smoke at exam time)
ENV http_proxy= https_proxy= HTTP_PROXY= HTTPS_PROXY= ALL_PROXY= all_proxy=

# socat = the loopback relay (the bridge refuses non-loopback binds by design;
# 0.0.0.0:7790 → 127.0.0.1:7788, and docker publishes 7790 to HOST loopback only)
RUN apt-get update && apt-get install -y --no-install-recommends socat ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1010 bench && mkdir -p /bridge /bench/out && chown -R bench:bench /bench

ADD cursor-sdk-bridge-standalone-linux-${BRIDGE_ARCH}.tar.gz /bridge/
COPY entrypoint.sh /bench/entrypoint.sh
RUN chmod +x /bridge/bin/cursor-sdk-bridge /bench/entrypoint.sh && chown -R bench:bench /bridge

USER bench
WORKDIR /bench

# bridge binds in-container loopback at a FIXED port; the relay exposes 7790
ENV CURSOR_SDK_BRIDGE_HOST=127.0.0.1 \
    CURSOR_SDK_BRIDGE_PORT=7788

ENTRYPOINT ["/bench/entrypoint.sh"]
