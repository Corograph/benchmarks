# The containers the comparison group ran in

Every comparison-group run executed inside a Docker image built from the definition in
its arm's folder here (`build_images.sh` builds them all; `base/` is the hermetic
claude-code image the Claude-shaped arms build FROM). The repository under test is
mounted read-only at `/bench/repo`, results are written to `/bench/out`, the model is
passed as `BENCH_MODEL`, and credentials arrive as environment variables at `docker run`
time only — never in an image layer. Pinned third-party archives are not included; their
`*SHA256SUMS` files are the pin evidence.

| arm | image digest(s) the published runs carry | run script |
|---|---|---|
| cbm | `bench-cbm:latest@sha256:7956959468dbe6a7ac4c0f2c4a3170aacef4f3bae5397c55378adc0e8c2094d8`<br>`bench-cbm:latest@sha256:be5b5e16f84b72002cad0738d49e3ea3a9885797af6f758844a7efc0e70461c0` | `cbm/run.sh` |
| codegraph | `bench-codegraph:latest@sha256:22397b9c7030c6b62b6bd1d32acec433be23baece17ec3243c45fb4fc4a7ef3b`<br>`bench-codegraph:latest@sha256:d8d443436bdfd2ba3fe44dde5fe3380bfe7f3f50da7be5d13cd39970cc917132` | `codegraph/run.sh` |
| codex | `bench-codex:latest@sha256:b0f8c410feb52327826936bf88a87c1ad67375e6a44e6e0acc81937d553fb31b`<br>`bench-codex:latest@sha256:d33cb29bbfbcddc95f57c364104fdb8410261934a255f955c6e8d5405fbb0fa5` | `codex/codex-launch.sh` |
| cold | `bench-cold:latest@sha256:11d4f976d7a2c9004e2ba863e9832ff8833da24a216b91577fd345b9e9b55afd`<br>`bench-cold:latest@sha256:6d6b255d2b5ca888313fb74ce7fcba3794cc4fbe24316179f1809a58829dbb7c` | `cold/run.sh` |
| cursor | `bench-cursor:latest@sha256:2099eda34b442e67234af03c3e40470983f02121154e87d5d662bccd165e9292` | — |
| gitnexus | `bench-gitnexus:latest@sha256:18e6e748f657b8826739c03a03b237a647d01aa2dfc80937edfd45799e9034a9`<br>`bench-gitnexus:latest@sha256:c801d8074cc25e20ec2cc153f7c8eb6cbc9bef7d1c48ffba936e379a2c6b655a` | `gitnexus/run.sh` |
| graphify | `bench-graphify:latest@sha256:be790a7f4910b25780a377531f5ab27a6ff596de0fa0dda52c0501c6a1d39e22`<br>`bench-graphify:latest@sha256:e6cfefa3a9719bac693e87a1dd120007be0b29d2a23141d5bdedefd3f29f38c4` | `graphify/run.sh` |
| serena | `bench-serena:latest@sha256:94899b440b263db1121d6dcbc87a67569c127b28c211d8db794231079ce798b8`<br>`bench-serena:latest@sha256:e4490457a72e73d237b181596d9fae5003d32b3f68e162d56bd0629c64bf0c6f` | `serena/run.sh` |

## Example `docker run` lines (one per arm, as recorded on a cell; values of `-e` variables are never on the command line)

### cbm

```
docker run --rm --name bench-cbm--fable-5--r1-h01 -e CLAUDE_CODE_OAUTH_TOKEN -e BENCH_MODEL=claude-fable-5 -e BENCH_WRITABLE=0 -v ~/svml/Corograph/ta-bench-repos/memos:/bench/repo:ro -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/cbm--fable-5--r1/h01/out:/bench/out -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/cbm--fable-5--r1/h01/run.sh:/bench/run.sh:ro bench-cbm:latest bash /bench/run.sh
```

### codegraph

```
docker run --rm --name bench-codegraph--fable-5--r1-h01 -e CLAUDE_CODE_OAUTH_TOKEN -e BENCH_MODEL=claude-fable-5 -e BENCH_WRITABLE=1 -v ~/svml/Corograph/ta-bench-repos/memos:/bench/repo:ro -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/codegraph--fable-5--r1/h01/out:/bench/out -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/codegraph--fable-5--r1/h01/run.sh:/bench/run.sh:ro -v ~/svml/Corograph/ta-bench/arms/codegraph/prestage.sh:/bench/prestage.sh:ro bench-codegraph:latest bash /bench/run.sh
```

### codex

```
docker run -i --rm --name bench-codex--gpt-5.6-luna--r1-h01 -v ~/svml/Corograph/ta-bench-repos/memos:/bench/repo:ro -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260826-153758-5f3f59/codex--gpt-5.6-luna--r1/h01/out:/bench/out -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260826-153758-5f3f59/codex--gpt-5.6-luna--r1/h01/codex-launch.sh:/bench/codex-launch.sh:ro -v ~/svml/Corograph/ta-bench/codex_auth.json:/bench/auth.json:ro bench-codex:latest bash /bench/codex-launch.sh
```

### cold

```
docker run --rm --name bench-cold--fable-5--r1-h01 -e CLAUDE_CODE_OAUTH_TOKEN -e BENCH_MODEL=claude-fable-5 -e BENCH_WRITABLE=0 -v ~/svml/Corograph/ta-bench-repos/memos:/bench/repo:ro -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/cold--fable-5--r1/h01/out:/bench/out -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/cold--fable-5--r1/h01/run.sh:/bench/run.sh:ro bench-cold:latest bash /bench/run.sh
```

### cursor

```
docker run -d --name bench-cursor--composer-2.5--r1-h01 -p 127.0.0.1:0:7790 -e CURSOR_API_KEY -v ~/svml/Corograph/ta-bench-repos/memos:/bench/repo:ro -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260901-152123-9b993b/cursor--composer-2.5--r1/h01/out:/bench/out bench-cursor:latest
```

### gitnexus

```
docker run --rm --name bench-gitnexus--fable-5--r1-h01 -e CLAUDE_CODE_OAUTH_TOKEN -e BENCH_MODEL=claude-fable-5 -e BENCH_WRITABLE=1 -v ~/svml/Corograph/ta-bench-repos/memos:/bench/repo:ro -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/gitnexus--fable-5--r1/h01/out:/bench/out -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/gitnexus--fable-5--r1/h01/run.sh:/bench/run.sh:ro -v ~/svml/Corograph/ta-bench/arms/gitnexus/prestage.sh:/bench/prestage.sh:ro bench-gitnexus:latest bash /bench/run.sh
```

### graphify

```
docker run --rm --name bench-graphify--fable-5--r1-h01 -e CLAUDE_CODE_OAUTH_TOKEN -e BENCH_MODEL=claude-fable-5 -e BENCH_WRITABLE=1 -v ~/svml/Corograph/ta-bench-repos/memos:/bench/repo:ro -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/graphify--fable-5--r1/h01/out:/bench/out -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/graphify--fable-5--r1/h01/run.sh:/bench/run.sh:ro -v ~/svml/Corograph/ta-bench/arms/graphify/prestage.sh:/bench/prestage.sh:ro bench-graphify:latest bash /bench/run.sh
```

### serena

```
docker run --rm --name bench-serena--fable-5--r1-h01 -e CLAUDE_CODE_OAUTH_TOKEN -e BENCH_MODEL=claude-fable-5 -e BENCH_WRITABLE=0 -v ~/svml/Corograph/ta-bench-repos/memos:/bench/repo:ro -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/serena--fable-5--r1/h01/out:/bench/out -v ~/svml/Corograph/ta-bench-data/execution-tmp/Mini-M4-48GB/exams/exq-20260807-042150-02a92e/serena--fable-5--r1/h01/run.sh:/bench/run.sh:ro -v ~/svml/Corograph/ta-bench/arms/serena/mcp.json:/bench/mcp.json:ro bench-serena:latest bash /bench/run.sh
```

