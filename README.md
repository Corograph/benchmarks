# COROGRAPH Benchmarks — the public proof package

**Explore the results:** [https://benchmarks.corograph.com](https://benchmarks.corograph.com/) — every figure, with its controls, definition and data table,
computed from this repository; every number on it links back to the run directory here.

This repository is the complete, machine-produced evidence behind the Corograph benchmark
numbers: the questions, the grading key, every arm's answers to every question, every verdict with
the judge's stated reason, the per-run economics (tokens, time, tool calls, vendor-reported cost),
and the transcripts of every session. Nothing in it was written by hand. The tree is the output of
one export command run against the benchmark's own store, every published byte is validated before
it is written, and re-running the export over the same store reproduces the tree byte for byte.

The claim under test is simple: **an AI coding agent that can query Corograph's index of a
codebase answers questions about that codebase more accurately, more consistently and more cheaply
than the same model finding its way with text search** — and that this holds against
the popular alternatives: Claude Code alone, Claude Code with each of the codebase-indexing tools
people actually install, and the vendors' own native agents. This package lets anyone check that claim
question by question, answer by answer, verdict by verdict.

## Epoch-4 at a glance

Epoch 004 — line-4 · instrument: Indexer v1.4.7 — Corograph v0.11.4 — Dev v0.4.16

| | |
|---|---|
| runs published | 2692 (2480 valid and scored · 212 did-not-finish, published unscored) |
| Corograph runs | 515 |
| comparison-group runs | 2177 |
| arms | 9 (1 Corograph · 8 comparison) |
| models | 11 |
| exam × battery pairs | 6 |
| files in the tree | 207235 |
| scorer era | tabench-1.1 |
| export tool | `tabench export public` 0.1.29 |

## What is being compared

Every arm answers the same questions about the same repository at the same pinned commit, at the
same models, under the same three exam protocols, from the same clean checkout. An **arm** is one
configuration of tooling; a **model** is the LLM behind it; a **run** is one repetition of one arm ×
model × exam × battery. Repetitions are independent sessions; nothing is carried between them.

### The Corograph side

- **`cg-ask-fz-009`** — the Corograph *Ask* agent: the model is given Corograph's **codebase index** of
  the repository — built by Corograph's own proprietary indexing system, designed for LLM
  consumption — which it queries through the `corograph_query` tool, beside ordinary file tools (read,
  grep, glob, tree). The agent runs through the Corograph gateway against the vendor's API; the
  index, the indexer and the exam harness are pinned as one
  **instrument freeze** whose version record is in `epochs/E004/manifest.json` (`freezes`). The
  freeze number is part of the arm id, so a re-run under a new instrument is a new arm, never a
  silent revision. Models: claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5, gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra.

### The comparison group

The comparison group is **epoch-free**: these arms do not change when the Corograph instrument
does, so their runs carry forward and are reused by later epochs. The Claude-shaped arms all build
FROM one hermetic base image (`docker-containers/base/`): no user configuration, no memory, no
global instruction files, permission checks bypassed (the container is the boundary), telemetry off,
the full tool surface visible to the model. Each tool is installed **as shipped** — its own installer,
its own prompt assets, skills and hooks — because those are part of what a user gets.

- **`cbm`** — Claude Code + codebase-memory-mcp (DeusData), installed as shipped: a tree-sitter code graph served over MCP with the tool's own query surface, prompt assets and skills. Models: claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5.
- **`codegraph`** — Claude Code + codegraph (`@colbymchenry/codegraph`), installed as shipped: its MCP code graph, with the project index built before each session (`prestage.sh`). Models: claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5.
- **`codex`** — OpenAI Codex CLI as a native harness (its own agent loop, tools and sandbox), driven through its app-server protocol; OpenAI models. Models: gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra.
- **`cold`** — Claude Code with nothing added — the null hypothesis: Read / Grep / Glob / Bash over the mounted repository, no index of any kind. Models: claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5.
- **`cursor`** — Cursor Agent driven through Cursor's SDK bridge (Cursor's own agent runtime); a multi-vendor model catalog, so Cursor appears at both Anthropic and OpenAI models. Models: claude-haiku-4-5, claude-opus-5, claude-sonnet-5, composer-2.5, gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra, grok-4.6.
- **`gitnexus`** — Claude Code + GitNexus, installed as shipped: a knowledge-graph MCP whose `analyze` step builds the graph and writes its own context files into the working copy before each session. Models: claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5.
- **`graphify`** — Claude Code + graphify (Graphify-Labs), installed as shipped: a skill-driven code graph, built before each session and queried through the tool's skill. Models: claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5.
- **`serena`** — Claude Code + Serena (Oraios) as an MCP server: language-server-backed semantic tools (gopls for Go, the TypeScript language server for the web tree). Models: claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5.

### Coverage in Epoch-4

Runs per arm × exam × battery; `valid/total` where some did not finish.

| arm | HumanExam · memos | HumanExam · memos-hard | ZeroShotExam · memos | ZeroShotExam · memos-hard | MultiTurnExam · memos | MultiTurnExam · memos-hard |
|---|---|---|---|---|---|---|
| `cg-ask-fz-009` | 86/92 | 80/86 | 86/91 | 80/81 | 85 | 79/80 |
| `cbm` | 20 | 25 | 45/60 | 50/65 | 53 | 53 |
| `codegraph` | 20 | 25 | 45/62 | 50/65 | 54 | 54 |
| `codex` | 30 | 30 | 30 | 30 | 30 | 30 |
| `cold` | 20 | 25 | 45/60 | 50/65 | 53 | 53 |
| `cursor` | — | — | 80 | 80 | 80 | 80 |
| `gitnexus` | 20 | 25 | 45/65 | 50/65 | 53 | 53 |
| `graphify` | 20 | 25 | 45/65 | 50/65 | 53 | 53 |
| `serena` | 20 | 25 | 45/65 | 54/65 | 54 | 54 |

## The repository under test and its question batteries

**usememos-memos** — https://github.com/usememos/memos at commit `2d01420c23372d5708904ec78e03485edb44d49b`, checked out clean and mounted read-only for every run (`repositories/usememos-memos/`).

| battery | questions | denominator | title |
|---|---|---|---|
| `memos` | 30 | 30 | battery-1 (30q) |
| `memos-hard` | 20 | 20 | battery-2 (20q hard) |

A battery is a fixed, frozen set of questions about the codebase. Each question carries a difficulty
(1 easy → 5 extremely hard), one or more categories (endpoints, db, types, calls, impact,
cross-stack, and the hard battery's classes such as absence-proof, multi-hop, collision, dispatch),
and an `output_structure` telling the model the shape of answer expected. Question ids are `qNN`
in the base battery and `hNN` / `rNN` in the hard battery (`r` questions carry a false premise the
model must reject). The grading key beside each battery holds:

- `questions.json` — what every arm was asked, verbatim, with position, difficulty and categories.
- `gold.json` — the answer key: `answer_gold`, the accepted variants, the per-question scoring rubric
  and honesty trap where one exists, the facet guide the judge reads, and every gold revision.
- `policies.json` — battery-wide scoring rules (for example: two path spellings of the same file are
  equivalent; line numbers are evidence, not scored content).
- `exemplars.json` — graded anchor answers (correct / incorrect / partial, each with *why*) the judge
  is calibrated against. The same set is presented to the judge for every arm (see below).
- `amendments.json` — the gold change ledger (empty when gold changes were recorded as revisions in
  `gold.json` rather than as ledger rows).

## How the questions and the grading key were made

The questions were not written by Corograph's authors. Each battery was authored by a frontier model
(Claude Fable 5) working as an agent over the pinned repository, with no access to Corograph, its
index or its outputs, and no knowledge of what it captures. The agent first studied the codebase, then
drafted questions to cover the ways developers actually ask about code: endpoints, schema, types, call
paths, impact, cross-stack tracing, absence proofs and false premises. It ran headless sessions on
Haiku 4.5, Sonnet 5 and Opus 4.8 to see the variety of answers each question produced before the set
was fixed. The hard battery was iterated under an explicit brief: questions that are not answerable
by matching the words of the question against the source, because developers don't always phrase
prompts in the codebase's own identifiers, and these become more difficult for LLMs to get correct.

The sequence, per battery: questions authored and approved → gold drafted by the same agent → gold
verified against the pinned checkout by multiple agents, with and without Corograph, reading the
source → corrections applied with file:line evidence → questions and gold frozen and hashed →
evaluation. Corograph was used to *verify* gold after the questions existed; it never chose what was
asked. Every gold fact carries a file:line anchor at the pinned commit, so any reader can check it
with grep alone.

- **`memos`** — the base battery (30 questions). Authored and owner-approved 2026-07-17; gold verified 2026-07-18 against the pinned checkout in an independent sweep: 24 of 30 verified as drafted, 6 corrected with file:line evidence (q11, q13, q16, q20, q21, q28); frozen and hashed 2026-07-18. A 2026-07-21 audit over ~500 scored answers reconfirmed every fact and changed only the scoring layer (policies S1–S6 and accepted variants).
- **`memos-hard`** — the hard battery (20 questions) in the classes nameless-entry, absence-proof, multi-hop, collision, aggregation, dispatch, field-grain and reality-check (false premises the model must reject). Design rule: the question text may not contain the target entity's name, except in the collision class where the ambiguous name is the challenge. Authored and owner-approved 2026-07-20; gold verified 2026-07-20 against the pinned checkout with Corograph and the source; accepted variants ruled 2026-07-21; two amendments 2026-07-22.

In the sweeps leading up to this epoch, every failed answer was reviewed through a command-line
review loop: for one question at a time, the bench exports the full grading context
plus every banked answer with its verdict; a reviewing agent with access to the repository classifies
each failure as partially correct, hallucinated in part, or correct but shaped so that the mechanical
tier or the judge missed it; corrections come back as gold revisions, battery policies, per-question
facet guides and graded exemplars. Facts never changed in that loop; the scoring layer did, and every
change is published (`gold.json` carries every revision). The loop ran several times until the key
was stable; the key that resulted is the scorer era under which this whole epoch was judged.

- **`memos`** — 146 graded exemplars (57 correct · 60 incorrect · 29 partial), each verified against the
  repository and blessed by `memos-agent` on 2026-08-05; 3 questions carry a second gold revision;
  15 exemplar texts recur verbatim in this epoch's published answer sheets (short exact-form answers).
- **`memos-hard`** — 167 graded exemplars (67 correct · 59 incorrect · 41 partial), each verified against the
  repository and blessed by `memos-agent` between 2026-08-05 and 2026-08-06; 3 questions carry a second gold revision;
  no exemplar text recurs verbatim in this epoch's published answer sheets.

Exemplars were selected from real banked answers across all arms, so an exemplar can coincide with an
answer under judgment; the guarantee is symmetry, not exclusion: the same exemplar set, the same gold
and the same policies are presented to the judge for every arm, in every call. Nothing in the key is
arm-specific.

## The three exam protocols

| exam | what the model sees | sessions | why it exists |
|---|---|---|---|
| `HumanExam` | the whole battery in ONE prompt; one reply; answers extracted per question by their labels | 1 | the stress probe — retrieval under many concurrent obligations, the way a human sits a paper |
| `ZeroShotExam` | one question per prompt, each in a **fresh** session | 1 per question | clean per-question attribution of tokens, time and tools |
| `MultiTurnExam` | one question per turn in ONE session; history accumulates | 1 | the conversational shape — later questions pay for earlier context |

The three protocols have different token denominators (a MultiTurn question replays its history; a
ZeroShot question pays the fixed prefix again), so per-question figures are only compared within a
protocol, and `history_replay_delta` keeps the MultiTurn replay cost recoverable.

## Repository layout

```
.
├── README.md                              this document (regenerated by every export)
├── repositories/                          the repositories under test + their grading keys
│   └── usememos-memos/
│       ├── README.md                      the repo, its commit, its batteries
│       ├── repo.json                      source url · commit · public folder name
│       └── batteries/
│           ├── memos/                  questions.json · gold.json · policies.json · exemplars.json · amendments.json
│           └── memos-hard/             questions.json · gold.json · policies.json · exemplars.json · amendments.json
├── judging/
│   ├── judge-prompt.md                    the judge's SYSTEM and USER prompts, rendered over placeholders
│   ├── scorer-eras.json                   the grading-key lineage (scorer version × gold revision)
│   └── transports.md                      how the judge is called; what a verdict's judge.transport means
├── runs/                                  every run, stored ONCE
│   └── <arm>/<model>/<exam>/<battery>/rep<NN>/
│       ├── run.json                       identity · provenance · validity · economics · scoring · transcript summary · file digests
│       ├── answers/<qid>.md               the answer extracted for each question (what the judge graded)
│       ├── verdicts.json                  every verdict with tier, judge, reason, facets + the assembled score
│       └── transcript/                    the session record, lane-shaped (see below)
├── epochs/
│   └── E004/
│       ├── manifest.json                  every run path + the SHA-256 of its run.json; freezes; image digests; scope
│       ├── README.md                      the epoch's roster
│       └── summary/
│           ├── leaderboard.csv            per arm × model × exam × battery over valid scored runs (DERIVED)
│           ├── per-question.csv           pass counts per question (DERIVED)
│           ├── runs.json                  one flat row per run — the bundle the companion site's figures are computed from (DERIVED)
│           ├── rate-tables.json           the USD-per-million-token tables behind every estimated cost (DERIVED)
│           └── adoption.json              how often each harness consulted its codebase index, per question (DERIVED)
├── docker-containers/                     the images the comparison group ran in
│   ├── README.md                          image digests per arm + one example docker run line per arm
│   ├── build_images.sh                    builds every image on a machine
│   ├── base/Dockerfile                    the hermetic Claude Code base the Claude-shaped arms build FROM
│   └── <arm>/                             Dockerfile + run.sh / prestage.sh / mcp.json / config.toml as executed
└── redaction/
    ├── POLICY.md                          the one thing withheld, and exactly how
    └── summary.json                       per-class redaction counts of the last export
```

Runs are stored once and an epoch is a **manifest over them**: the Corograph arm it tested plus
the comparison-group runs it is measured against. A later epoch (a new instrument freeze) adds a new
manifest and its own Corograph runs; the comparison group is reused, never duplicated.

## How to read one run

Take `runs/<arm>/<model>/<exam>/<battery>/rep<NN>/`. Everything about the run is in four places.

**`run.json`** — the run record (`schema_version: public-run/1`):

- `identity` — arm, its display label, family (`product` for Corograph; `cc_bare`, `cc_competitor`,
  `harness_bare` for the comparison group), side, model, exam, battery, denominator, repetition, the
  repository and its commit, the exam epoch (Corograph side only) and the run key.
- `provenance` — where and under what the run executed: the capture host, the exam queue it ran in,
  capture timestamps, the record shape, and per lane: the container image digest (comparison group),
  the harness's own version line (`codex_version_live`, `cursor_bridge_version`), or the instrument
  freeze, tuple and live version self-report (Corograph). A run whose units executed on more than
  one host or image lists every value.
- `validity` — `ok`, a `reason` (`run_ok`, or a did-not-finish class such as `partial_exam`), a detail
  (for example which question never completed) and the run's status.
- `economics` — the four token columns and where they came from (`token_source`), vendor-reported cost
  or `null`, wall-clock duration, main-thread turns, LLM calls, the tool-call rollup (`total`, `by_class`,
  `by_tool`), and `per_question` rows for the per-question protocols.
- `scoring` — the assembled score: `total` over `denominator`, `by_difficulty` (passes per difficulty),
  `tier_census` (how many verdicts came from the mechanical tier vs the judge), the scorer era, and
  any human adjudications. A did-not-finish run has `total: null` and a note.
- `transcript` — the lane (`gateway` for Corograph, `docker` for the Claude-shaped arms, `harness`
  for Codex and Cursor), whether artifacts came from the durable exam tree or were reconstructed from
  content-addressed blobs, and the per-unit summary (files; for the gateway lane also the tool-call and
  index-query counts and the redaction counts).
- `redaction` — what the export replaced in this run's Corograph-side prose (all zeros on the
  comparison side; `paths` counts home-directory normalizations, which happen on both sides).
- `files` — the SHA-256 of every other file in the run directory.

**`answers/<qid>.md`** — the answer text extracted for each question: the whole reply for the
per-question protocols, the labelled block for `HumanExam`. This is exactly what the judge graded.

**`verdicts.json`** — one entry per question: `result` (`pass` / `fail` / `adjudicate` / `infra`), the
`tier` it was decided at, the judge's `reason` (under fifteen words) and observational `facets`
(`extra_correct_info`, `missing_minor`, `erroneous_assertion`), the judge model and transport, the
gold revision and scorer era, and the timestamp; plus the assembled `score`. Human adjudications,
where present, are listed with who / when / why and outrank the judge.

**`transcript/`** — the session record, in the shape the lane produced it:

- *Gateway lane (Corograph)* — one JSONL file per unit (`q01.jsonl` … per question for
  `ZeroShotExam`; one file for the whole conversation for `MultiTurnExam`; `sheet.jsonl` for
  `HumanExam`). Records are `user` (the prompt as presented, with the agent name and model),
  `assistant` (the model's text, with the ids of the tool calls it made), `tool_result` (one per
  tool call: name, status, latency, and for file tools their arguments; for `corograph_query` calls the
  product's own display sentence — e.g. "Found callers of X" — plus latency and the size of the result
  in characters, in place of the query text and raw result) and `turn_end` (per-turn token usage).
  See `redaction/POLICY.md`.
- *Docker lane (the Claude-shaped arms)* — one folder per unit (`q01/`, `h01-r05/` for a MultiTurn
  battery, `sheet/`): `prompt.<qid>.txt` as presented, `envelope.<qid>.json` (Claude Code's own JSON
  result envelope: session id, reported usage and cost), `transcripts/*.jsonl` (Claude Code's session
  logs, verbatim — the main thread and every `agent-*.jsonl` subagent thread), `claude-version.txt`,
  and where the tool builds an index first, `prestage.log` and `prestage.time.txt`.
- *Harness lane (Codex, Cursor)* — the harness's own conversation record, verbatim: for Codex the
  app-server rollout (`rollout/…/*.jsonl`, including its encrypted reasoning items as the harness
  stores them), `codex-stderr.log` and `codex-version.txt`; for Cursor `conversation.t<N>.json` per
  turn and `agent-messages.json`; plus the `prompt.<qid>.txt` files as presented.

Home-directory prefixes are normalized to `~/` in every text file, on both sides.

## Validity and did-not-finish

A run that did not finish — a question that never completed, a dead tool executor, an API error page
in place of an answer, a context overflow — is published with `validity.ok = false`, its reason, and
**no score**. It never enters a mean, a leaderboard row or a per-question count: a failure is a fact
about the run, never a zero. Quarantined runs (an operator ruling, recorded with a reason) are not
published at all. In Epoch-4, 212 runs are published as did-not-finish.

## Scoring

Scores are **derived state**. Every verdict carries the scorer era (the grading-key lineage — scorer
version × gold revision, listed in `judging/scorer-eras.json`) and the gold revision it was judged
against; a whole published epoch sits under one scorer era by construction (the export refuses to
publish mixed eras). Two tiers:

- **T1 — mechanical.** A token-subset match of the answer against the gold and its accepted variants.
  It can only PASS an answer; it never fails one.
- **T2 — the judge.** An LLM called with ONE question, its gold, the battery policies, the question's
  facet guide and its graded exemplars, and ONE candidate answer (`judging/judge-prompt.md`). It
  returns a verdict, a short reason and facets — never a total; totals are assembled by the bench from
  the per-question verdicts. Per-answer isolation is deliberate: no candidate is ever shown another.
  A verdict whose reason contradicts it is retried once, sternly; a persistent contradiction becomes
  `adjudicate` (counted as a fail, listed separately for a human). A vendor outage is `infra` — a gap
  to retry, never a verdict.

The judge runs through one of two transports stamped on every verdict (`judging/transports.md`): the
vendor API with nothing but the prompt, or a hermetic Claude Code call with a scratch configuration,
tools disabled and the prompt supplied verbatim, with a per-call check that nothing else entered the
context. `tier_census` in every score tells you how much of it was mechanical and how much was judged.

## Token honesty and economics

Four token columns per run and per question — `tokens_input` (the **uncached** tail), `tokens_output`,
`tokens_cache_read`, `tokens_cache_write` — and a `token_source` naming how they were derived:

- `ledger_all_calls` — the gateway's per-API-call ledger, summed (Corograph).
- `transcript_all_threads` — summed over every assistant event in every session log, subagent threads
  included (the Claude-shaped arms; Claude Code's own envelope figure under-counts multi-thread runs).
- `codex_reported_derived` / `cursor_reported_derived` — the harness's own per-call usage, with the
  derivation named (Codex reports input inclusive of cached tokens; the uncached tail is the difference).

The run record carries cost only when the vendor reported it (`cost_reported_usd`, the Claude Code
envelope's figure); the summary rows add a rate-table estimate where no figure was reported, with the
basis named on every row (see Summaries). Tool calls are rolled up by tool and by class (`cc_builtin`,
`subagent`, `skill`, `vendor_mcp` for an installed tool's MCP surface, `harness_builtin` for a native
harness's own tools, `product_builtin` for the Corograph file tools and `product_semantic` for its
index queries).

## Summaries

`epochs/E004/summary/` is derived from the runs and regenerated by every export — never hand-edited.

- `leaderboard.csv` — per arm × model × exam × battery: `runs`, `valid`, `scored`, `dnf`,
  `denominator`, `mean_total`, `mean_pct`, `min`, `max`. Means are over valid scored runs only.
- `per-question.csv` — per arm × model × exam × battery × question: `pass`, `n`, `pass_rate`.
- `runs.json` — one flat row per run (identity, validity, score and fail counts, the four token
  columns and their source, duration with its basis (the run's own figure for `HumanExam`; the sum of
  the per-question durations for the per-question protocols), LLM and tool call counts by class, tool wall time, tool
  result tokens, index-query count, cost with its basis, and the run's path). Every figure on the
  companion site is computed from this file and nothing else, so a site number can always be
  traced to a run directory here.
- `rate-tables.json` — the USD-per-million-token tables. A row's `cost_usd` is the vendor-reported
  figure when the harness reported one (`cost_basis: vendor_reported`), otherwise the estimate from
  the named table over the four token columns (`cost_basis: estimated:<table version>`); a model
  with no rate row has `cost_usd: null` and never enters a cost mean.
- `adoption.json` — per arm × model × exam × battery, at question grain: how many question runs
  made at least one call to the arm's codebase index (`questions_with_index` of `questions`), the
  index calls summed, the setup calls excluded from that count (project activation, index build or
  status, instructions — listed per arm under `setup_tools_excluded`), and the same at conversation
  grain for MultiTurn. Every arm's prompt was tool-neutral and every tool was installed as shipped
  with its own instructions in place, so this is organic adoption: the companion site's Figure 16.

The summaries are conveniences. The runs are the evidence.

## What is withheld

One thing: the text of the queries the Corograph agent sends to its codebase index, and the raw
result envelopes those queries return — product surface, not benchmark evidence. Every such call is
still visible in the transcript with its display sentence, status, latency and result size, and where
the agent's prose quotes a query the span becomes a marker (`[Corograph query]`), never a deletion — the
count and placement of index queries is part of the proof. The internal code names of the Corograph
components are replaced by descriptive names (`arm_map` / `freeze_map` in the manifest list the
published identifiers). Comparison-group transcripts are verbatim. The full policy, including the list
of things that are not published at all (the agent's system prompt and tool manifest, raw wire taps,
operational logs), is `redaction/POLICY.md`; `redaction/summary.json` carries the counts.

## Reproducibility and integrity

- The tree is produced by `tabench export public --epoch N --out <dir>`: a store predicate selects
  the runs (the predicates are printed in the manifest under `scope`, and `scope.run_selection` says
  whether they were published whole or narrowed to a declared run list), artifacts are read by content
  digest, every file is validated against a forbidden-pattern list before anything is written, and the
  write is atomic per run. `--check` re-exports and diffs; an unchanged store yields a byte-identical tree.
- `epochs/E004/manifest.json` lists every run with the SHA-256 of its `run.json`, and each `run.json`
  lists the SHA-256 of every other file in its directory — the whole tree is hash-chained from one file.
- The comparison group's images are pinned by digest (`docker_images` in the manifest; the build
  contexts are in `docker-containers/`), credentials only ever arrive as environment variables at
  `docker run` time, and the in-container protocol scripts are published as executed.
- The Corograph instrument is pinned as a freeze whose version record — indexer, index query
  engine and surface, exam harness, module list — is in the manifest under `freezes`, and every Corograph run
  carries the live version self-report of the binary that actually ran.

## Disclosures

- The comparison group is measured **as shipped**, prompt assets and all; Claude Code cannot be forced
  to use an installed tool, so what you see is organic adoption. That is the measurand.
- The Corograph arm ran on the host through its gateway; the comparison group ran in containers.
  Accuracy, tokens, turns and tool counts are location-independent; wall-clock figures are not
  compared across that boundary.
- Capture gaps are disclosed per run in `run.json` (`transcript.units` and the export's warnings), never
  silently filled. Runs whose units were resumed across hosts or image builds list every vintage.
- The capture host's name appears in provenance. Home directories are normalized; nothing else about
  the operators' machines is published.
- Comparison-side transcripts may contain short bracket tokens that resemble the withheld query
  vocabulary but are ordinary source code the model wrote; they are counted as review items in
  `redaction/summary.json` and left verbatim.
- **Fable 5 refused many questions.** The model declined a large share of the per-question prompts
  (plain questions about a public codebase's structure), so those runs did not finish and carry no
  score: 79 of 119 ZeroShot runs at Fable 5 are did-not-finish. Fable 5 is a thin roster in this
  epoch; read its columns with their n.
- **Haiku 4.5 and the whole-battery protocol.** HumanExam presents the entire battery in one prompt;
  at Haiku 4.5's 200K-token context window the accumulated tool results of a full battery can exceed
  the window. 5 of 25 HumanExam runs at Haiku 4.5 did not finish for that reason; the per-question
  protocols do not have this exposure.

## Epochs

An epoch is one Corograph instrument freeze measured against the comparison group. Epoch-4 (`epochs/E004/`) is the
first published epoch. Later epochs add `epochs/E00N/` and their own Corograph runs under `runs/`;
the comparison-group runs are shared. Every export is a commit in this repository.
