# cbm arm — codebase-memory-mcp (DeusData), installed as shipped. PROTOCOL.md §1.
# Doubles as the PO-COMP-004 delta re-eval (the 06-30 head-to-head predates their
# hybrid-LSP / 43-surface growth).
FROM bench-base:latest

# PIN the release before real runs. Their distribution: single static binary per
# platform from GitHub releases; their `install` subcommand registers the MCP
# server into the agent config — which in this image is the HERMETIC config dir,
# exactly where we want it (and why this tool stays containerized).
# PINNED 2026-07-17: latest release v0.9.0; assets are tar.gz per platform.
ARG CBM_VERSION=v0.9.0
ARG TARGETARCH

# L0 FINDING (2026-07-17): the standard linux asset is NOT static — it requires
# GLIBC>=2.38 / GLIBCXX_3.4.32 (fails on Debian 12/bookworm, glibc 2.36). The
# "-portable" asset is the actually-portable build; use that.
USER root
RUN curl -fsSL -o /tmp/cbm.tar.gz \
      "https://github.com/DeusData/codebase-memory-mcp/releases/download/${CBM_VERSION}/codebase-memory-mcp-linux-${TARGETARCH}-portable.tar.gz" \
 && tar -xzf /tmp/cbm.tar.gz -C /usr/local/bin/ \
 && rm /tmp/cbm.tar.gz
# The vintage stamp every arm image carries (owner ruling 2026-09-27): a label
# for `docker inspect` + a line in /bench/versions.txt the driver captures per cell.
LABEL org.truearchitect.bench.cbm.version="${CBM_VERSION}"
RUN echo "codebase-memory ${CBM_VERSION}" >> /bench/versions.txt
USER bench
# TODO(smoke): verify published checksum.

# MCP wiring — AS SHIPPED (PROTOCOL.md §3 fairness rule): the tool's own
# installer configures the agent, including their skills/instructions/hooks
# (the prompt-side assets the HH paper showed are load-bearing). It detects
# the in-image claude-code and writes into the hermetic HOME baked here.
# Index prebake happens at L0/runtime (fresh per run for determinism probes).
RUN codebase-memory-mcp install || echo "WARN: installer failed — inspect and fall back to a baked /bench/mcp.json"

# Index prebake happens at build so every run starts identically and L0 captures
# the timing here (PROTOCOL.md §3). Requires the repo at build context — wire in
# run_matrix.sh via `docker build --build-context repo=...` at smoke time.
# TODO(smoke): RUN --mount=from=repo,target=/bench/repo cbm index /bench/repo && \
#              cbm install   # registers MCP into $CLAUDE_CONFIG_DIR
