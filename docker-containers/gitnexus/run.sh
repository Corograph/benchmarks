set -euo pipefail
capture_transcripts() {
  mkdir -p /bench/out/transcripts
  find "$HOME/.claude/projects" -name "*.jsonl" -exec cp {} /bench/out/transcripts/ \; 2>/dev/null || true
}
claude --version > /bench/out/claude-version.txt 2>&1 || true
if [ "${BENCH_WRITABLE:-0}" = "1" ]; then
  cp -r /bench/repo "$HOME/work"
  cd "$HOME/work"
  if [ -f /bench/prestage.sh ]; then
    { time bash /bench/prestage.sh > /bench/out/prestage.log 2>&1 ; } 2> /bench/out/prestage.time.txt
  fi
else
  cd /bench/repo
fi
MCP_ARGS=()
if [ -f /bench/mcp.json ]; then MCP_ARGS=(--strict-mcp-config --mcp-config /bench/mcp.json); fi
SID=""
for QF in /bench/out/prompt.*.txt; do
  QID="$(basename "$QF" .txt)"; QID="${QID#prompt.}"
  if [ -z "$SID" ]; then
    claude -p "$(cat "$QF")" --model "$BENCH_MODEL" --output-format json --permission-mode bypassPermissions \
      ${MCP_ARGS[@]+"${MCP_ARGS[@]}"} > "/bench/out/envelope.$QID.json" || true
  else
    claude -p -r "$SID" "$(cat "$QF")" --model "$BENCH_MODEL" --output-format json --permission-mode bypassPermissions \
      ${MCP_ARGS[@]+"${MCP_ARGS[@]}"} > "/bench/out/envelope.$QID.json" || true
  fi
  NEWSID="$(jq -r '.session_id // empty' "/bench/out/envelope.$QID.json" 2>/dev/null || true)"
  [ -n "$NEWSID" ] && SID="$NEWSID"
  capture_transcripts
done
capture_transcripts
