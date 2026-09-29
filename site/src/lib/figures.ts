// The figure registry — every figure the site shows, declared once: what it
// measures, how the columns are formed, its caption (three sentences: what it
// measures, how to read it, what it shows) and its formal explanation. The
// registry is pure data so the same declaration drives the build-time page,
// the client island and the navigation.
import type { CellKind } from './stats'

export type MeasureKey = 'ctx' | 'ctx_per_correct' | 'pct' | 'tool_calls' | 'wall' | 'llm_calls' | 'out_tokens' | 'cost' | 'cost_per_correct' | 'tool_result_tokens' | 'adoption'
// pooled: one column per arm · per-model: one column per model for every arm,
// grouped BY ARM · by-model: the transpose — one group per MODEL with every
// arm inside it (Corograph first), the same-tier read at a glance
// (a vendor-bound measure over a multi-vendor roster still splits — see engine).
export type ColumnsMode = 'per-model' | 'pooled' | 'by-model'
export type BatteryChoice = 'memos' | 'memos-hard' | 'both'

export type Figure = {
  slug: string
  number: number
  title: string       // the figure title, e.g. "Context tokens per run"
  short: string       // nav label
  kind: 'columns' | 'dots' | 'stack' | 'heatmap' | 'lines'
  measure: {
    key: MeasureKey     // which per-run value the rows carry (pct for spread statistics)
    cell: CellKind      // the statistic inside a cell
    label: string       // axis / table label
    unit: 'tokens' | 'pct' | 'ms' | 'count' | 'd' | 'usd'
    better: 'high' | 'low'
    vendorBound?: boolean // raw token counts: never pooled across vendors (tokenizers differ)
  }
  defaults: { exams: string[]; battery: BatteryChoice; columns: ColumnsMode; model?: string }
  // The columns choice is SITE-WIDE (remembered, synced across every figure);
  // a figure whose meaning is one mode declares it here and hides the control.
  // A 'per-model' lock means SPLIT is required: the by-model transpose is
  // still offered (both are one column per model; only the grouping differs).
  lockColumns?: ColumnsMode
  reference: 'bare' | 'none'   // dashed lines at Corograph's and the bare harnesses' pooled values
  caption: [string, string, string]
  explanation: string[]        // formal paragraphs
  disclosures?: string[]
}

export const FIGURES: Figure[] = [
  {
    slug: 'context-tokens', number: 1, title: 'Context tokens per run', short: 'Context tokens', kind: 'columns',
    measure: { key: 'ctx', cell: 'mean', label: 'context tokens per run (input + tool results + cache read)', unit: 'tokens', better: 'low', vendorBound: true },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'Context tokens are the tokens the model read to answer a whole run: the uncached input plus every cache read, summed over every API call in the run, all threads included.',
      'Each column is the mean over the valid, scored runs of one arm at one model, every arm split by model because token counts are model facts; the dashed lines mark Corograph\'s and each bare harness\'s pooled value wherever pooling is licensed.',
      'At every model the Corograph column sits well below the same model running bare, and the indexing tools cluster at or above bare Claude Code: the index replaces reading.',
    ],
    explanation: [
      'Definition. For run r, context(r) = tokens_input(r) + tokens_cache_read(r), where tokens_input is the uncached tail of every request and tokens_cache_read the cached prefix re-read on each call. Both are summed over all API calls of the run, including sub-agent threads, from the per-call record named by token_source in the run record (a gateway ledger for Corograph; the harness session logs or the harness\'s own per-call usage for the comparison group). Cache writes and output tokens are excluded here and reported in the run records.',
      'Aggregation. A column is the arithmetic mean of context(r) over the valid, scored runs of one arm at one model, for the selected exam and battery. When both batteries are selected, each battery forms its own cell and the column is the mean of the two cell means, so the longer battery does not dominate.',
      'Why per model. Token counts are tokenizer facts: a Sonnet token and a GPT token are not the same unit. The site therefore never pools raw token counts across vendors. The pooled-models view (the default) pools an arm over its roster only where the roster is a single vendor; an arm spanning two vendors stays split into one column per model whatever the columns choice, which the table discloses.',
      'Reading it. Lower is better. The like-for-like comparison is column to column at the same model: Corograph at Sonnet 5 against bare Claude Code at Sonnet 5, Corograph at GPT 5.6 Sol against Codex at GPT 5.6 Sol. The dashed reference lines are Corograph\'s and the bare harnesses\' pooled means, drawn only where a pooled value is licensed (a single-vendor roster), so the indexing tools have both Corograph and their baseline in the same picture.',
    ],
    disclosures: [
      'Exam protocols have different token denominators (a MultiTurn question replays its history; ZeroShot pays the fixed prefix per question). Switch protocols with the control above; the site never pools across them.',
      'A run whose token facts were not captured is excluded from its column, never counted as zero; the table\'s n is the number of runs behind each column.',
    ],
  },
  {
    slug: 'accuracy', number: 2, title: 'Accuracy per run', short: 'Accuracy', kind: 'dots',
    measure: { key: 'pct', cell: 'mean', label: 'accuracy (% of questions correct)', unit: 'pct', better: 'high' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'Accuracy is the share of a run\'s questions whose answer the grading pipeline marked correct, so every dot is one complete run of one arm at one model.',
      'The solid tick is the arm\'s pooled mean, the thin line its worst-to-best range, and dots are translucent so overlap reads as density; hover a dot for its model, repetition and run directory.',
      'Corograph\'s distribution sits highest and tightest; the lower context use in Figure 1 is not bought with accuracy.',
    ],
    explanation: [
      'Definition. For a scored run r, accuracy(r) = 100 · score(r) / denominator(r), where score is the number of questions with an effective verdict of pass (tier T1 mechanical match or tier T2 judge, human adjudication outranking both) and denominator is the battery size. Did-not-finish runs have no score and are absent from this figure by construction.',
      'Aggregation. The mean tick is the hierarchical mean: cells of battery × model × exam are averaged with equal weight. The range line spans the minimum and maximum run. Every dot is drawn; nothing is summarised away.',
      'Reading it. Higher is better. Compare the position of the means and, separately, the vertical spread: two arms with the same mean and different spread are not equivalent instruments, and the spread is what a user experiences run to run.',
    ],
  },
  {
    // FIGURE OF ITS OWN (owner 2026-09-14): the hard battery was a slice of Figure 2
    // that three home cards pointed at under one number; every graph now has its
    // own number, top to bottom of the navigation.
    slug: 'accuracy-hard', number: 3, title: 'Accuracy on the hard battery', short: 'Hard battery', kind: 'dots',
    measure: { key: 'pct', cell: 'mean', label: 'accuracy on the hard battery (% of questions correct)', unit: 'pct', better: 'high' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'memos-hard', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'The hard battery is the twenty questions where matching text alone cannot reach the answer: fifteen that need several components understood together (multi-hop chains, absence proofs, dispatch, cross-stack tracing), and five with a false premise the arm must recognise and refuse.',
      'Same statistic and same reading as Figure 2, restricted to that battery: every dot is one run, the tick its pooled mean, the thin line its range; the battery control above lets you put the base battery back.',
      'On the base battery every arm sits near the ceiling; here the tools separate, and Corograph\'s cloud sits highest at every shared model.',
    ],
    explanation: [
      'Definition and aggregation as in Figure 2, with the battery fixed to the hard battery (denominator 20). The base battery is excluded by default because its ceiling compresses every arm into the same band; the difference between an index and a search shows where the questions were designed to need one.',
      'Reading it. Higher is better. The false-premise questions count a refusal as correct and an invented answer as wrong, so an arm that answers confidently from text matches is penalised exactly where a user would be misled.',
    ],
  },
  {
    // CONSISTENCY (owner 2026-09-14): the scorecard's run-to-run spread statistic,
    // promoted from a card-only figure to a page of its own.
    slug: 'consistency', number: 4, title: 'Run-to-run variation of accuracy', short: 'Consistency', kind: 'columns',
    measure: { key: 'pct', cell: 'cv', label: 'run-to-run variation of accuracy (coefficient of variation, %)', unit: 'pct', better: 'low' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'Consistency asks how far the same tool at the same model moves when the same questions are run again: the coefficient of variation of run accuracy, in percent, within a battery × model × protocol cell.',
      'Each column is that variation averaged with equal weight over the arm\'s cells (or over its roster in the pooled-models view); lower is steadier, and Corograph and the bare harnesses are the dashed references.',
      'Corograph\'s columns are the lowest: the index does not only raise the mean of Figure 2, it narrows the spread a user experiences run to run.',
    ],
    explanation: [
      'Definition. Within a cell (arm × battery × model × exam) with scored runs of accuracies a₁…aₙ, cv = 100 · sd(a) / mean(a), with the n−1 standard deviation; a cell with one run has no spread and contributes nothing. The statistic is dimensionless, so cells at different means compare directly.',
      'Aggregation. Cells averaged with equal weight over the selected batteries, models and protocols. A cell whose mean is zero has no defined variation and is excluded.',
      'Reading it. Lower is better. Two arms with the same mean accuracy and different variation are not the same instrument: the variation is the part of the result that depends on the run rather than on the tool.',
    ],
  },
  {
    slug: 'pass-rate', number: 5, title: 'Reliability: runs scoring at least 90 percent', short: 'Reliability', kind: 'columns',
    measure: { key: 'pct', cell: 'passrate90', label: 'share of runs at or above 90 % accuracy', unit: 'pct', better: 'high' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'Reliability asks a stricter question than accuracy: of all the runs an arm made, what share reached 90 percent or better?',
      'Each column is that share over the arm\'s valid, scored runs at one model (or pooled over its roster in the pooled-models view), with Corograph and the bare harnesses as dashed references.',
      'The gap between arms is far wider here than in mean accuracy: the index converts a good average into a dependable result.',
    ],
    explanation: [
      'Definition. Within a cell (arm × battery × model × exam), pass-rate90 = 100 · |{r : accuracy(r) ≥ 90}| / |{r scored}|. The threshold is fixed at 90 percent of the battery, that is 27 of 30 on the base battery and 18 of 20 on the hard battery.',
      'Aggregation. Cells are averaged with equal weight across the selected batteries (and models, when pooled). The statistic is bounded in [0, 100] and is a property of the distribution, not of the mean; it is the figure to read when the question is "how often does this work well", rather than "how well does it work on average".',
      'Reading it. Higher is better. Because the threshold is strict, small differences in mean accuracy become large differences here, which is why the figure is reported alongside Figure 2 rather than instead of it.',
    ],
  },
  {
    slug: 'effect-size', number: 6, title: 'Effect size against bare Claude Code', short: 'Effect size', kind: 'columns',
    measure: { key: 'pct', cell: 'cohend', label: "Cohen's d vs bare Claude Code, accuracy", unit: 'd', better: 'high' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'none',
    caption: [
      'Cohen\'s d expresses how far an arm\'s accuracy distribution sits from bare Claude Code\'s in units of their pooled standard deviation, so it is comparable across batteries and models.',
      'Each column is the mean d over cells that contain both the arm and bare Claude Code at the same model, battery and protocol; bare Claude Code is the zero line by definition, and arms with no shared Anthropic cell have no value.',
      'By convention d of 0.2 is small, 0.5 medium and 0.8 large; Corograph is the only arm above the large threshold.',
    ],
    explanation: [
      'Definition. Within a cell shared by the arm (n₁ runs, accuracies with mean m₁ and standard deviation s₁) and bare Claude Code (n₂, m₂, s₂), d = (m₁ − m₂) / s_p with s_p = √(((n₁−1)s₁² + (n₂−1)s₂²) / (n₁+n₂−2)). Standard deviations use the n−1 denominator.',
      'Aggregation. The column is the equal-weight mean of d over the cells the arm shares with bare Claude Code. A cell with a single run on either side contributes a degenerate deviation and is reported as such in the table. Codex and Cursor at non-Anthropic models have no bare Claude Code counterpart and are therefore absent, not zero.',
      'Reading it. Higher is better; negative values would mean the arm is worse than bare Claude Code. The figure answers "is the difference large relative to run-to-run noise", the question a mean alone cannot answer.',
    ],
  },
  {
    slug: 'outcomes', number: 7, title: 'Outcome composition per run', short: 'Outcomes', kind: 'stack',
    measure: { key: 'pct', cell: 'mean', label: 'questions correct · incorrect · unanswered, per run', unit: 'pct', better: 'high' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'none',
    caption: [
      'Every valid run becomes one thin column showing how its questions divided between correct (the arm\'s color), incorrect (dark) and unanswered or unjudged (black), so an arm\'s whole record is visible at once.',
      'Columns are ordered by model then repetition; the number above each group is the arm\'s mean accuracy and the number inside is its difference from Corograph.',
      'The dark bands are the honesty layer: the failures are on the page, not in a footnote.',
    ],
    explanation: [
      'Definition. For a scored run, correct = score, incorrect = the count of effective verdicts of fail, and the residue denominator − correct − incorrect is the unanswered or unjudged portion (an adjudicate or infra verdict, or a question with no verdict). Each is drawn as a share of the denominator.',
      'Aggregation. None: every scored run is one column. The header figure is the hierarchical mean accuracy of the group and the inner figure is that mean minus Corograph\'s.',
      'Reading it. Higher is better for the colored band. The width of a group is proportional to the number of runs the arm made in the selection, which is itself information: an arm with fewer columns has fewer runs behind its numbers.',
    ],
    disclosures: ['Did-not-finish runs have no score and do not appear here; their count per arm is in the run records and in the Limitations page.'],
  },
  {
    slug: 'tokens-per-correct', number: 8, title: 'Context tokens per correct answer', short: 'Tokens per correct', kind: 'columns',
    measure: { key: 'ctx_per_correct', cell: 'mean', label: 'context tokens per correct answer', unit: 'tokens', better: 'low', vendorBound: true },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'This divides a run\'s context tokens (Figure 1) by the number of questions it answered correctly, so an arm that reads less but also answers less is not rewarded.',
      'Each column is the mean over valid, scored runs at one model (or pooled over a single-vendor roster in the pooled-models view), lower is better, and Corograph and the bare harnesses are the dashed references.',
      'The ordering of Figure 1 survives the normalisation: the token saving is a saving per correct answer, not a saving bought with wrong answers.',
    ],
    explanation: [
      'Definition. For a scored run with score(r) > 0, ctx_per_correct(r) = context(r) / score(r). Runs with no correct answer have no defined value and are excluded from the mean; their count is in the table.',
      'Aggregation. As in Figure 1: cell means averaged with equal weight; raw token counts are never pooled across vendors.',
      'Reading it. Lower is better. Cost in currency is deliberately not shown here: the package publishes cost only where a vendor reported it, and Corograph\'s runs carry no vendor-reported figure. Tokens are the quantity a reader can recompute from the run records.',
    ],
  },
  {
    slug: 'tool-calls', number: 9, title: 'Tool calls per run', short: 'Tool calls', kind: 'columns',
    measure: { key: 'tool_calls', cell: 'mean', label: 'tool calls per run', unit: 'count', better: 'low' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'A tool call is one invocation of any tool the arm offered its model: file reads, searches, shell commands, sub-agents, an indexing tool\'s query surface, or the Corograph index.',
      'Each column is the mean number of calls per run over valid, scored runs, split by model for Corograph and the bare harnesses.',
      'Fewer calls with higher accuracy is the signature of a good index: the model asks its question once instead of searching for the answer many times.',
    ],
    explanation: [
      'Definition. tool_calls(r) is the count of tool invocations recorded for the run across all sessions and threads; the run record breaks the count down by tool and by class (built-in, sub-agent, skill, an installed tool\'s MCP surface, a native harness\'s own tools, Corograph file tools, and Corograph index queries).',
      'Aggregation. Cell means averaged with equal weight over the selected batteries and models.',
      'Reading it. Lower is better only in combination with Figures 2 and 5: a low count with low accuracy is an arm that gave up early. Read the three together.',
    ],
  },
  {
    slug: 'wall-time', number: 10, title: 'Wall time per run', short: 'Wall time', kind: 'columns',
    measure: { key: 'wall', cell: 'mean', label: 'active answering time per run', unit: 'ms', better: 'low' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'Wall time is the sum of the active answering segments of a run: the session for HumanExam, each question\'s session for ZeroShot, each turn for MultiTurn.',
      'Each column is the mean over valid, scored runs; the benchmark\'s own dispatch and capture time between segments is excluded.',
      'Timing is environment-coupled and reported as indicative magnitude only; see the disclosures below before comparing across the host boundary.',
    ],
    explanation: [
      'Definition. wall(r) = Σ duration of the run\'s answering segments, as recorded by the lane driver. Provider latency, lane parallelism and retry back-offs all ride this figure.',
      'Aggregation. Cell means averaged with equal weight. Runs whose duration was not captured are excluded, never counted as zero.',
      'Reading it. Lower is better, with the caveat that this is not a controlled latency benchmark.',
    ],
    disclosures: [
      'The Corograph arm executed on the host through its gateway; the comparison group executed in containers on the same machine. Accuracy, tokens and tool counts are location-independent; wall time is not, and the figure is published for completeness rather than as a claim.',
      'Runs executed in parallel lanes shared the host; per-lane contention is not modelled.',
    ],
  },
  {
    slug: 'model-tiers', number: 11, title: 'Accuracy by model', short: 'Accuracy by model', kind: 'columns',
    measure: { key: 'pct', cell: 'mean', label: 'accuracy (% of questions correct)', unit: 'pct', better: 'high' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'per-model' },
    lockColumns: 'per-model',
    reference: 'none',
    caption: [
      'The same accuracy as Figure 2, split into one column per model for every arm, so the cross-tier comparison is readable directly.',
      'Within an arm the columns run from the fastest, cheapest model to the frontier model of each vendor.',
      'The comparison to make is diagonal: Corograph at a fast or everyday model against a bare harness or an indexing tool at a frontier model.',
    ],
    explanation: [
      'Definition and aggregation as in Figure 2, with cells restricted to one model per column.',
      'Reading it. Higher is better. The vendor tiers are declared, not inferred: fast = Haiku 4.5 and GPT 5.6 Luna; everyday = Sonnet 5 and GPT 5.6 Terra; frontier = Opus 5, GPT 5.6 Sol and Composer 2.5.',
    ],
  },
  {
    slug: 'categories', number: 12, title: 'Pass rate by question category and difficulty', short: 'Categories', kind: 'heatmap',
    measure: { key: 'pct', cell: 'mean', label: 'pass rate (% of question attempts correct)', unit: 'pct', better: 'high' },
    // opens on the Anthropic roster: the models EVERY arm ran, so the pooled cells are like for like
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled', model: 'anthropic' },
    reference: 'none',
    caption: [
      'Every question carries one or more categories and a difficulty; each cell is the pass rate of an arm on the questions in that category (or at that difficulty), pooled over the selected models — by default the Anthropic models, which every arm ran.',
      'The number in each cell is the pass rate; the color is that cell\'s difference from bare Claude Code in the same column — blue above, orange below, neutral at the baseline — so a row reads as where an arm beats or trails the null hypothesis.',
      'The categories where an index should matter most, structural questions such as callers, impact and cross-stack tracing, are where the separation is widest.',
    ],
    explanation: [
      'Definition. For an arm, model, exam, battery and question, the per-question record gives pass (attempts marked correct) and n (attempts). For a category c, the pass rate at one model is Σ pass / Σ n over the questions carrying c; the cell value is the equal-weight mean over the arm\'s models. Difficulty cells are formed the same way over the questions at that difficulty.',
      'Aggregation. One question may carry several categories and then contributes to each; category rates are therefore not additive across categories. The model control decides which models a cell pools, with equal weight per model. The figure opens on the Anthropic roster because every arm ran those models, so the cells compare like with like; "OpenAI models" does the same for the GPT roster (Corograph, Codex and Cursor); a single model is the sharpest read. With "all" a cell pools the arm\'s OWN roster: Corograph ran GPT 5.6 Luna, Terra and Sol as well as the Claude models, while bare Claude Code and the indexing tools ran Claude models only, so a pooled Corograph cell averages in three models its comparators never ran. The multi-hop column is the clearest case: two questions (h06, h07) on which Corograph at every Claude model matches or beats bare Claude Code, while the GPT models score far lower and pull the all-models cell from 91 down to 69; field-grain flips the same way. The comparison pages carry this grid restricted to their own arms and models.',
      'Reading it. Higher is better. Read a row to see an arm\'s profile and a column to see which arms handle a question class. Color encodes polarity, not magnitude: each cell is colored by its distance from bare Claude Code\'s pass rate in the same column (the column mean if that arm is absent from the selection), on a symmetric scale whose half-width is the largest difference in the figure and never less than ten points; the number is always the pass rate itself. A two-hue diverging scale with a neutral midpoint was chosen over a green-to-red one because the latter is unreadable under red–green color vision deficiency.',
    ],
  },
]

FIGURES.push(
  {
    slug: 'cost-per-correct', number: 13, title: 'Cost per correct answer', short: 'Cost per correct', kind: 'columns',
    measure: { key: 'cost_per_correct', cell: 'mean', label: 'USD per correct answer', unit: 'usd', better: 'low' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'Cost per correct answer divides what a run cost by the number of questions it answered correctly: the vendor-reported figure where the harness reported one, otherwise the benchmark\'s estimate from the published rate tables over the run\'s four token columns.',
      'Each column is the mean over valid, scored runs at one model (or pooled over the arm\'s roster in the pooled-models view); Corograph and the bare harnesses are the dashed references, and the data table names each row\'s cost basis.',
      'The context saving of Figure 1 becomes a price saving at every model, and the ordering survives the normalisation by correct answers.',
    ],
    explanation: [
      'Definition. For a scored run with score(r) > 0, cost_per_correct(r) = cost(r) / score(r), where cost(r) is the vendor-reported cost when the harness reported one (Claude Code\'s own result envelope) and otherwise the estimate Σ tokens × rate for the four token columns, using the rate table that applies to the arm: Cursor\'s published prices for the Cursor arm, Augment\'s vendor-list-plus-40-percent for Auggie, the vendor list prices for everything else. The tables are published as `epochs/E00N/summary/rate-tables.json`; each run row carries `cost_basis` naming which one priced it.',
      'Aggregation. Cell means averaged with equal weight over the selected batteries, models and protocols. A run whose model has no rate row has no cost and is excluded from the mean, never counted as zero.',
      'Reading it. Lower is better. Because estimates ride list prices, an arm on a subscription plan may pay less in practice; the figure is an API-equivalent price, comparable across arms because it is computed the same way for all of them. Codex reports no cache-write split, so its estimate charges written tokens at the input rate: a disclosed floor of at most 25 percent of the input component.',
    ],
    disclosures: ['Vendor-reported and estimated costs sit in the same column; the table beneath the figure carries the basis per row and the rate tables are published beside the run rows.'],
  },
  {
    slug: 'cost-variance', number: 14, title: 'Cost per run', short: 'Cost per run', kind: 'dots',
    measure: { key: 'cost', cell: 'mean', label: 'USD per run', unit: 'usd', better: 'low' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'Every dot is what one run cost (vendor-reported where available, otherwise estimated from the rate tables), so the spread of an arm\'s price is visible, not just its mean.',
      'The solid tick is the pooled mean and the thin line the range; hover a dot for its model, repetition and run directory.',
      'A tight, low cloud is an arm whose price is predictable; a tall cloud is one whose price depends on the run.',
    ],
    explanation: [
      'Definition. cost(r) as in Figure 13, drawn per run rather than averaged.',
      'Aggregation. None for the dots; the mean tick is the equal-weight mean of battery × model × protocol cells.',
      'Reading it. Lower is better; read spread as well as position.',
    ],
  },
  {
    slug: 'tool-result-tokens', number: 15, title: 'Tool result tokens per run', short: 'Tool result tokens', kind: 'dots',
    measure: { key: 'tool_result_tokens', cell: 'mean', label: 'tool result tokens per run (estimated)', unit: 'tokens', better: 'low', vendorBound: true },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'pooled' },
    reference: 'bare',
    caption: [
      'Tool result tokens are the volume of text the arm\'s tools pushed back into the model\'s context over a run — file contents, search hits, shell output, or an index query\'s result — estimated per call from the result size.',
      'Every dot is one run, split per model for every arm; the solid tick is the mean and the thin line the range.',
      'This is the mechanism behind Figure 1 seen from the tool side: the index returns a small, precise answer where a search returns pages to read.',
    ],
    explanation: [
      'Definition. tool_result_tokens(r) = Σ over the run\'s tool calls of the result\'s token estimate, taken from the capture where the harness recorded one and otherwise result bytes ÷ 4. For Corograph index queries the estimate is the size of the result the model received.',
      'Aggregation. None for the dots; the mean tick is the equal-weight mean of battery × model × protocol cells. Raw token counts are never pooled across vendors.',
      'Reading it. Lower is better. Read it beside Figure 9 (tool calls): fewer calls returning less text is the signature of a good index.',
    ],
  },
  {
    // INDEX ADOPTION (owner 2026-09-17): how often the harness actually reached for
    // the index it was given — organic, never prompted. Neutral by design: the
    // figure is a description of behaviour, not a ranking.
    slug: 'index-adoption', number: 16, title: 'Organic index adoption by model', short: 'Index adoption', kind: 'lines',
    measure: { key: 'adoption', cell: 'mean', label: 'share of question runs that called the arm\'s codebase index (%)', unit: 'pct', better: 'high' },
    defaults: { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both', columns: 'per-model' },
    lockColumns: 'per-model',
    reference: 'none',
    caption: [
      'Every arm here was given a codebase index and left to decide whether to use it: the prompt named no tool, each indexing tool was installed as shipped with its own instructions in place, and every tool was directly visible to the model. This figure is how often the harness actually called the index it had, per model.',
      'Each line is one arm across the models it ran, from the fastest to the frontier model; a point is the share of that arm\'s question runs at that model in which at least one tool call went to the arm\'s index, with the tool\'s setup calls excluded. Hover a point for the counts; the table beneath carries every number.',
      'Read it as a description of behaviour rather than a ranking: it says how much of each arm\'s result was produced with its index in the loop, and how that changed as the model got stronger.',
    ],
    explanation: [
      'Definition. A question run is one question answered by one arm at one model in one repetition (a ZeroShot session, or one turn of a MultiTurn conversation). It counts as using the index when at least one of its main-thread tool calls is an index call: for Corograph, a query to its codebase index; for an indexing tool served over MCP, a call to that tool\'s own tool surface; for Graphify, which ships as a skill rather than an MCP server, an invocation of that skill. Calls that prepare a tool rather than ask it a question — project activation, instruction fetches, index build or status checks, schema reads — are excluded from the count and listed per arm in the summary file under setup_tools_excluded, so a reader can put them back.',
      'Aggregation. For an arm at one model, the share is computed within each protocol × battery cell and the cells are averaged with equal weight, the same pooling law as every other figure, so the longer battery and the larger protocol never outvote the others. The table beneath the figure reports the summed counts as well as the share.',
      'Setup. The per-question prompt is published in the repository and names no tool. Each indexing tool was installed by its own installer into the container\'s home directory, which is where those installers write their MCP registration, instructions, hooks or skill; GitNexus and CodeGraph also built their index before the first question, as their documentation directs, and GitNexus wrote its own context files into the working copy. Claude Code\'s deferred tool loading was switched off for every arm, so the full MCP tool surface was visible to the model without a search step. Corograph ran through its own gateway with its index available from the first call. Nothing on either side prompted the model toward or away from any tool.',
      'Reading it. The vertical axis is the share of question runs that used the index; it is not a score. A low value means the harness answered mostly by reading and searching the source with the index unused; a high value means the index was in the loop for most answers. The figure should be read with Figures 1, 2 and 8: an arm\'s accuracy and token results were produced with its index used this often.',
    ],
    disclosures: [
      'Main thread only: MCP tools are not offered to sub-agent threads, so a sub-agent\'s reads and searches do not enter this figure. HumanExam is whole-battery and has no per-question tool attribution; it is not shown.',
      'MultiTurn is reported per question; one conversation carries a whole battery, so a conversation that consulted the index once early is counted at the questions where it did so. The table reports the per-conversation figure beside it (conversations with at least one index call).',
      'Graphify ships as a skill: its graph was built before the session and the skill invocation is the index call; reads of the graph files by other means are not distinguishable from ordinary file reads and are not counted.',
      'CodebaseMemory indexes on demand: its index was not built before the session, so its index_repository and index_status calls are setup calls, excluded here and listed in the summary file. Serena has no prebuilt index by design; its project activation and instruction calls are setup calls likewise.',
      'The share says how often the index was called, not whether its answer was used: a run that queried the index and then read the source is counted the same as one that answered from the query. The tool sequences themselves are in each run\'s transcript.',
    ],
  },
)

// Figure numbers ARE the navigation order (owner 2026-09-14): every graph has
// its own number, 1..N top to bottom. Insert a figure where it belongs and
// renumber what follows (and the prose that cites it); this guard makes a
// gap or a duplicate a build failure rather than a page that lies.
FIGURES.forEach((f, i) => {
  if (f.number !== i + 1) throw new Error(`figures.ts: ${f.slug} is number ${f.number} at position ${i + 1} — numbers must run 1..N in navigation order`)
})

export const figureBySlug = (slug: string) => FIGURES.find(f => f.slug === slug)
