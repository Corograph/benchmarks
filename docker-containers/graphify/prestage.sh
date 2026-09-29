#!/usr/bin/env bash
# graphify prestage — build graphify-out/ (code-only pipeline, assembled verbatim
# from their SKILL.md steps; byte-deterministic per L0). Their skill's fast path
# then treats every question as a graph query — build-once-then-query as shipped.
set -e
PY=/opt/pipx/venvs/graphifyy/bin/python
"$PY" - <<'EOF'
import json
from pathlib import Path
from graphify.detect import detect
from graphify.extract import collect_files, extract
from graphify.build import build_from_json
from graphify.cluster import cluster
from graphify.export import to_json

INPUT = str(Path.cwd())
OUT = Path("graphify-out"); OUT.mkdir(exist_ok=True)

det = detect(Path(INPUT))
(OUT / ".graphify_detect.json").write_text(json.dumps(det, ensure_ascii=False), encoding="utf-8")

code_files = []
for f in det.get("files", {}).get("code", []):
    code_files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])
ast = extract(code_files, cache_root=Path(INPUT))
(OUT / ".graphify_ast.json").write_text(json.dumps(ast, indent=2, ensure_ascii=False), encoding="utf-8")

sem = {"nodes": [], "edges": [], "hyperedges": [], "input_tokens": 0, "output_tokens": 0}
(OUT / ".graphify_semantic.json").write_text(json.dumps(sem), encoding="utf-8")

seen = {n["id"] for n in ast["nodes"]}
merged_nodes = list(ast["nodes"])
merged = {"nodes": merged_nodes, "edges": ast["edges"], "hyperedges": [],
          "input_tokens": 0, "output_tokens": 0}
(OUT / ".graphify_extract.json").write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")

G = build_from_json(merged, root=INPUT, directed=False)
comms = cluster(G)
to_json(G, comms, str(OUT / "graph.json"), force=True)
print("graphify-out/graph.json ready:", len(merged_nodes), "nodes")
EOF
