# usememos-memos

Repository under test: https://github.com/usememos/memos at commit `2d01420c23372d5708904ec78e03485edb44d49b`.

| battery | questions | denominator |
|---|---|---|
| memos | 30 | 30 |
| memos-hard | 20 | 20 |

Each battery folder holds `questions.json` (what every arm was asked, with difficulty and
categories), `gold.json` (the answer key with accepted variants, rubrics and facet guides, every
gold revision), `policies.json` (battery-wide scoring rules), `exemplars.json` (graded anchors
the judge is calibrated against) and `amendments.json` (the gold change ledger).
