#!/usr/bin/env bash
# codegraph prestage — build the project index before the session (their
# `codegraph init`, deterministic per L0). cwd = the writable working copy.
set -e
codegraph init --yes . || codegraph init .
codegraph status || true
