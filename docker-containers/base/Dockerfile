# bench base — hermetic claude-code environment every competitor arm builds FROM.
# PROTOCOL.md §3. Auth (CLAUDE_CODE_OAUTH_TOKEN) is passed at `docker run -e` time
# ONLY — never add it to this file or any layer.
FROM node:22-bookworm-slim

# PINNED — never `latest` (owner ruling 2026-09-27; the vintage archaeology in
# ta-bench-data/docker-images/README.md is what floating cost us). Epoch-4's
# archived images ran 2.1.220 / 2.1.221; 2.1.283 is the ruled version for the
# 5.5-generation models (Fable 5.1 + Opus 5.5 need a newer CLI). Override per
# build: `CLAUDE_CODE_VERSION=x.y.z scripts/build_images.sh`.
ARG CLAUDE_CODE_VERSION=2.1.283

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ripgrep ca-certificates curl jq \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}
# The vintage, stamped twice: an image label (docker inspect) and a file the
# in-container cell script copies to /bench/out (per-cell capture — every arm
# image APPENDS its own tool line to this file).
LABEL org.truearchitect.bench.claude-code.version="${CLAUDE_CODE_VERSION}"
RUN mkdir -p /bench && echo "claude-code ${CLAUDE_CODE_VERSION}" > /bench/versions.txt

# Non-root user: claude-code's bypassPermissions mode refuses to run as root,
# and the benchmark runs with all permission checks bypassed (PROTOCOL.md §3 —
# the container IS the permission boundary).
RUN useradd -m -u 1010 bench

# Hermetic HOME: no global CLAUDE.md, no operator docs, no user state, no memory.
# NOTE: deliberately NO CLAUDE_CONFIG_DIR override — tool installers (codegraph
# et al.) hardcode default locations (~/.claude.json, ~/.claude/); the scratch
# HOME alone provides hermeticity while giving every installer the layout it
# expects (as-shipped fidelity).
ENV HOME=/bench/home
RUN mkdir -p /bench/home/.claude /bench/repo /bench/out && chown -R bench:bench /bench

# API traffic only — kill nonessential egress (telemetry / error reporting).
# Full egress allowlisting (proxy sidecar → api.anthropic.com) is the L0 TODO.
ENV CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
ENV DISABLE_TELEMETRY=1
ENV DISABLE_ERROR_REPORTING=1

# Benchmark fairness (PROTOCOL.md §3): every arm's full MCP tool surface is
# directly visible — no deferred tool loading / search step between the agent
# and a tool's capabilities. Otherwise we measure claude-code's deferral
# heuristics, not the tools.
ENV ENABLE_TOOL_SEARCH=false

# Repo is mounted read-only at /bench/repo; results written to /bench/out (mounted).
USER bench
WORKDIR /bench/repo
