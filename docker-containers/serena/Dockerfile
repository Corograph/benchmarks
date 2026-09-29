# Serena arm — Oraios LSP-based semantic MCP, as shipped (uvx from git).
# PROTOCOL.md §1/§3. The heaviest image: needs Python+uv for serena itself and
# a Go toolchain so gopls can serve the memos backend; TS language server rides
# the base image's node. MCP registration = baked /bench/mcp.json (their
# documented `claude mcp add serena -- uvx ...` form), auto-detected by the runner.
FROM bench-base:latest

USER root
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv \
 && rm -rf /var/lib/apt/lists/*

# Go toolchain for gopls (bookworm's golang is too old).
ARG TARGETARCH
ARG GO_VERSION=1.23.4
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${TARGETARCH}.tar.gz" | tar -xz -C /usr/local
ENV PATH="/usr/local/go/bin:/bench/home/go/bin:/bench/home/.local/bin:${PATH}"

# uv for the bench user.
USER bench
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Pre-warm: bake serena's env + gopls so first benchmark run isn't a download storm.
# PINNED to the Epoch-4 vintage: the main-branch commit read from the archived
# 08-04 image (serena_agent 1.6.2.dev0). Serena has no release tags the bench
# tracks — the commit IS the version. mcp.json (mounted from THIS dir at
# runtime, not the in-image copy) must name the SAME commit, else uvx
# re-resolves `main` per cell and the prewarm pins nothing.
ARG SERENA_REF=cd04838be9a92fd5c4963e59ecbe88419482d741
RUN /bench/home/.local/bin/uvx --from git+https://github.com/oraios/serena@${SERENA_REF} serena --help > /dev/null || echo "WARN: serena prewarm failed"
# gopls: the LSP backend serena drives for Go — PINNED to the version read from
# both the archived founding (07-19) and Epoch-4 (08-04) serena images.
ARG GOPLS_VERSION=v0.23.0
RUN go install golang.org/x/tools/gopls@${GOPLS_VERSION} || echo "WARN: gopls install failed"
LABEL org.truearchitect.bench.serena.ref="${SERENA_REF}" org.truearchitect.bench.gopls.version="${GOPLS_VERSION}"
RUN echo "serena git+oraios/serena@${SERENA_REF}" >> /bench/versions.txt \
 && echo "gopls ${GOPLS_VERSION}" >> /bench/versions.txt

COPY mcp.json /bench/mcp.json
