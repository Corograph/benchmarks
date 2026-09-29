# Epoch-4

Epoch 004 — line-4

| arm | side | runs | models |
|---|---|---|---|
| cg-ask-fz-009 | corograph | 515 | claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5, gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra |
| cbm | comparison | 276 | claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5 |
| codegraph | comparison | 280 | claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5 |
| codex | comparison | 180 | gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra |
| cold | comparison | 276 | claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5 |
| cursor | comparison | 320 | claude-haiku-4-5, claude-opus-5, claude-sonnet-5, composer-2.5, gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra, grok-4.6 |
| gitnexus | comparison | 281 | claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5 |
| graphify | comparison | 281 | claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5 |
| serena | comparison | 283 | claude-fable-5, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-8, claude-opus-5, claude-sonnet-5 |

`manifest.json` lists every run path in this epoch with the SHA-256 of its `run.json`, the
instrument freeze the Corograph arm ran under, the container image digests the comparison
group ran in, and the scorer era every verdict carries. `summary/` is DERIVED from the runs
(regenerable; never hand-edited): `leaderboard.csv` per arm × model × exam × battery over valid
scored runs, `per-question.csv` pass counts per question.
