#!/usr/bin/env bash
# gitnexus prestage — analyze builds the KG + writes their AGENTS.md/CLAUDE.md
# context files into the working copy (their shipped one-command setup).
set -e
gitnexus analyze .
gitnexus status || true
