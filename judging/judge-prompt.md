# The judge prompt (scorer tabench-1.1)

Rendered by the bench's own `BuildJudgePrompts` over placeholders — the byte-stable SYSTEM half
(rules + policies + question + gold + facet guide + graded exemplars) and the USER half (the
candidate answer). One question per call, per-answer isolation; the judge returns a verdict +
reason + facets and NEVER a total — the script owns the totals. T1 is a mechanical token-subset
pass that never fails an answer; T2 is this prompt. A verdict whose reason contradicts it
triggers ONE stern retry (below); a persistent contradiction becomes `adjudicate`.

## SYSTEM

```
You are scoring ONE benchmark question against its gold key. Output ONLY a JSON object, no prose, no fences:
{"verdict":"pass" or "fail","reason":"<15 words","facets":{"extra_correct_info":bool,"missing_minor":bool,"erroneous_assertion":bool}}

RULES: the gold answer + accepted_variants + any scoring field define correctness — apply them exactly. Global policies:
{{policies: the battery's S-rules, one per line}}
Bare 'cannot determine' = fail; BUT a premise rejection asserting non-existence WITH the actual mechanism is judged on substance. 'Partial, not full credit' language maps to FAIL unless the full-credit bar is met. Extra correct detail = pass. Same-referent naming variation = pass. Missing answer = fail. The candidate may include tool narration; judge the answer content. Judge the ENTIRE answer body: when a complete correct body ends with an abbreviated summary line, grade the body, never the summary alone (memos-agent misgrade archaeology, h02: a fully-correct four-component answer was failed on its trailing one-component summary).
FACETS are observations, never the verdict: extra_correct_info = adds CORRECT detail beyond the gold; missing_minor = core answer correct but a minor element omitted; erroneous_assertion = confidently states something FALSE about the codebase (flag it even in a passing answer). Omit facets you did not observe.
CRITICAL: your verdict MUST follow from your reason. If your reason concludes the answer is correct, acceptable, or borderline-acceptable, the verdict IS pass.

-- QUESTION + GOLD --
{
 "accepted_variants": [
  "{{accepted variant}}"
 ],
 "answer_gold": "{{answer_gold}}",
 "honesty_trap": "{{honesty trap}}",
 "output_structure": "{{output structure}}",
 "question": "{{question prompt}}",
 "scoring": "{{scoring rubric}}"
}
-- FACET GUIDE (this question) --
{{facet guide}}
-- GRADED EXEMPLARS (verified anchors; calibrate against these) --
kind=correct answers PASS · kind=incorrect answers FAIL · kind=partial marks the BOUNDARY: read its why for exactly which elements pass and which fail. A candidate matching an exemplar's shape gets that exemplar's verdict.
[
 {
  "kind": "correct",
  "answer": "{{exemplar answer}}",
  "why": "{{why it is correct}}"
 }
]
```

## USER

```
-- CANDIDATE ANSWER --
{{candidate answer}}
```

## USER (stern retry)

```
STERN RETRY: your previous judgment contradicted itself (fail verdict with a pass-shaped reason). Re-judge carefully; verdict must match reason.

-- CANDIDATE ANSWER --
{{candidate answer}}
```
