#!/usr/bin/env bash
# codex arm smoke — OFFLINE image validation (no auth, no model spend):
#   1. codex --version (the per-cell vintage line)
#   2. app-server initialize round-trip over stdio (proves the JSON-RPC transport
#      works in-container: spawn, initialize request, response, initialized notify)
# Exit 0 = image serviceable; any failure is loud.
set -euo pipefail

echo "== codex --version =="
codex --version

echo "== CODEX_HOME contents =="
ls -la "${CODEX_HOME}"

echo "== app-server initialize round-trip =="
node - <<'EOF'
const { spawn } = require("child_process");

const child = spawn("codex", ["app-server"], { stdio: ["pipe", "pipe", "pipe"] });
let out = "";
let done = false;

const timeout = setTimeout(() => {
  if (!done) {
    console.error("SMOKE FAIL: no initialize response within 20s");
    console.error("stdout so far:", out);
    child.kill("SIGKILL");
    process.exit(1);
  }
}, 20000);

child.stderr.on("data", (d) => process.stderr.write("[app-server stderr] " + d));
child.stdout.on("data", (d) => {
  out += d.toString();
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id === 1 && !done) {
      done = true;
      clearTimeout(timeout);
      if (msg.error) {
        console.error("SMOKE FAIL: initialize returned error:", JSON.stringify(msg.error));
        child.kill("SIGKILL");
        process.exit(1);
      }
      console.log("initialize OK:", JSON.stringify(msg.result));
      child.stdin.write(JSON.stringify({ method: "initialized", params: {} }) + "\n");
      setTimeout(() => { child.kill("SIGTERM"); process.exit(0); }, 500);
    }
  }
});
child.on("exit", (code, sig) => {
  if (!done) {
    console.error(`SMOKE FAIL: app-server exited before responding (code=${code} sig=${sig})`);
    console.error("stdout so far:", out);
    process.exit(1);
  }
});

child.stdin.write(JSON.stringify({
  id: 1,
  method: "initialize",
  params: { clientInfo: { name: "ta-bench-smoke", title: "ta-bench image smoke", version: "0.0.1" } },
}) + "\n");
EOF

echo "SMOKE PASS"
