set -euo pipefail
umask 077
codex --version > /bench/out/codex-version.txt 2>&1 || true
if [ -f /bench/auth.json ]; then
  cp /bench/auth.json "${CODEX_HOME}/auth.json"
  chmod 600 "${CODEX_HOME}/auth.json"
else
  : "${OPENAI_API_KEY:?codex lane: no /bench/auth.json staged and no OPENAI_API_KEY env}"
  printf '{"auth_mode":"apikey","OPENAI_API_KEY":"%s","tokens":null,"last_refresh":null}' "$OPENAI_API_KEY" > "${CODEX_HOME}/auth.json"
fi
cd /bench/repo
exec codex app-server
