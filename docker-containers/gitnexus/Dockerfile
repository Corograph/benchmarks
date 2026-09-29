# GitNexus arm — installed as shipped (global npm → absolute-path MCP config,
# their documented fastest path). PROTOCOL.md §1/§3.
# GITNEXUS_SKIP_OPTIONAL_GRAMMARS=1 skips dart/proto/swift/kotlin native grammar
# builds (their documented no-C++-toolchain path; memos is Go+TS — unaffected).
# `gitnexus analyze` (index + AGENTS.md/CLAUDE.md context files) is deferred to
# L0/runtime and needs a WRITABLE repo copy — their analyze writes into the repo.
FROM bench-base:latest

USER root
# Core tree-sitter native module needs node-gyp's toolchain (the skip flag only
# covers the four optional grammars).
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
# PINNED to the Epoch-4 vintage (read from the archived 08-04 image; the 08-05
# rebuild carried the same release). A new gitnexus version = a new comparison
# vintage = Epoch-5, never a silent rebuild (owner ruling 2026-09-27).
ARG GITNEXUS_VERSION=1.6.9
ENV GITNEXUS_SKIP_OPTIONAL_GRAMMARS=1
RUN npm install -g gitnexus@${GITNEXUS_VERSION}
LABEL org.truearchitect.bench.gitnexus.version="${GITNEXUS_VERSION}"
RUN echo "gitnexus ${GITNEXUS_VERSION}" >> /bench/versions.txt
USER bench

# `setup` writes the MCP config for detected agents (hermetic HOME).
RUN gitnexus setup || echo "WARN: gitnexus setup failed — inspect"
