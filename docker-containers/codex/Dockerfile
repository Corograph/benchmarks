# codex arm — OpenAI Codex CLI as a native-harness comparison arm.
# design/EXTERNAL-HARNESS-ARMS.md (§0 program · §1.2c lane contract · §1.3 recon).
#
# SELF-CONTAINED (not FROM bench-base): bench-base is claude-code-shaped; codex is
# its own harness. Conventions kept identical: node slim base, non-root bench user
# (uid 1010), /bench/{repo,out} layout, hermetic home, version PINNED in the image
# (the vintage law — image:tag@ID + codex --version recorded per cell).
#
# AUTH IS NEVER BAKED. API key rides `docker run -e OPENAI_API_KEY` (value on the
# client env, never argv); subscription auth (owner-handled) will mount/deliver an
# auth.json into CODEX_HOME at run time — no layer may contain either.
FROM node:22-bookworm-slim

# PINNED — a codex upgrade is a NEW VINTAGE (bump deliberately, disclose per cell).
# Matches the source checkout investigated at lib-ref-code/ta-competitors/codex
# (rust-v0.148.0 @ 3ba0f711).
ARG CODEX_VERSION=0.148.0

RUN apt-get update \
 && apt-get install -y --no-install-recommends git ripgrep ca-certificates curl jq \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g @openai/codex@${CODEX_VERSION}

RUN useradd -m -u 1010 bench

# CODEX_HOME must PRE-EXIST or codex errors at startup (§1.2c: utils/home-dir).
# It holds the baked hermetic config.toml; rollouts land under
# $CODEX_HOME/sessions/... (native persistence — the driver copies them out of the
# container into the cell as capture artifacts).
ENV CODEX_HOME=/bench/codex-home
ENV HOME=/bench/home
RUN mkdir -p /bench/home /bench/codex-home /bench/repo /bench/out \
 && chown -R bench:bench /bench

# The hermetic config (see arms/codex/config.toml for the annotated recipe).
# NO AGENTS.md is ever placed in CODEX_HOME — the global instructions file is not
# budget-gated, so its ABSENCE is the only suppression (§1.2c).
COPY --chown=bench:bench config.toml /bench/codex-home/config.toml

# Proxy env can WIDEN Seatbelt/sandbox egress under network:false (§1.2c caveat).
# Scrub defensively at the image layer; the driver must also avoid passing them.
ENV HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= ALL_PROXY= all_proxy= NO_PROXY=

# In-image smoke: offline app-server initialize round-trip (no auth, no spend).
COPY --chown=bench:bench smoke.sh /bench/smoke.sh
RUN chmod +x /bench/smoke.sh

USER bench
WORKDIR /bench/repo
