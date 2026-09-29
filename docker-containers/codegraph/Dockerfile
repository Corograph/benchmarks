# codegraph arm — @colbymchenry/codegraph, installed as shipped. PROTOCOL.md §1/§3.
# Their `codegraph install` wires the MCP server + instructions + permissions into
# detected agents (claude-code in-image, hermetic HOME). Per-project graph build
# (`codegraph init`) is deferred to L0/runtime — repo isn't present at image build.
FROM bench-base:latest

USER root
# PINNED to the Epoch-4 vintage (read from the archived 08-04 image; 1.6.0
# shipped 08-26 and belongs to Epoch-5 — owner ruling 2026-09-27).
ARG CODEGRAPH_VERSION=1.5.0
RUN npm install -g @colbymchenry/codegraph@${CODEGRAPH_VERSION}
LABEL org.truearchitect.bench.codegraph.version="${CODEGRAPH_VERSION}"
RUN echo "codegraph ${CODEGRAPH_VERSION}" >> /bench/versions.txt
USER bench

RUN codegraph install --yes || codegraph install || echo "WARN: codegraph install failed — inspect"
