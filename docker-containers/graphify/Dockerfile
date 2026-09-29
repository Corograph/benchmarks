# graphify arm — Graphify-Labs (YC S26), installed as shipped. PROTOCOL.md §1/§3.
# NOTE: their integration is SKILL-based, not MCP — `graphify install` registers
# the /graphify skill (SKILL.md + references) into the agent profile; the skill
# drives the graphify CLI. Code parsing is tree-sitter/local; doc/media ingestion
# would use the assistant's model (not exercised — our questions are code-only).
FROM bench-base:latest

USER root
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip pipx \
 && rm -rf /var/lib/apt/lists/*
# PINNED to the Epoch-4 vintage (read from the archived 08-04 image; the 08-05
# rebuild most likely carried 0.9.33 — a one-release ambiguity disclosed in
# ta-bench-data/docker-images/README.md). graphifyy publishes near-daily; a
# floating install here moved 37 releases in seven weeks. Epoch-5 re-pins.
ARG GRAPHIFY_VERSION=0.9.32
RUN PIPX_HOME=/opt/pipx PIPX_BIN_DIR=/usr/local/bin pipx install graphifyy==${GRAPHIFY_VERSION}
LABEL org.truearchitect.bench.graphify.version="${GRAPHIFY_VERSION}"
RUN echo "graphifyy ${GRAPHIFY_VERSION}" >> /bench/versions.txt
USER bench

# Registers the skill into the hermetic HOME profile.
RUN graphify install || echo "WARN: graphify install failed — inspect"
