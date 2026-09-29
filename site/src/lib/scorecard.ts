// The Results scorecard: one verdict per measure × comparator, computed at
// build time from the same rows and the same engine as the figures, so the
// table can never disagree with the figure it links to.
//
// LIKE FOR LIKE BY CONSTRUCTION: every cell compares Corograph and the
// comparator over the models BOTH ran (their shared roster), pooled with
// equal weight per protocol × battery × model cell. A raw-token measure over
// a shared roster spanning two vendors is compared per model and reported
// as a range of ratios (tokenizers differ; such counts are never pooled).
import type { RunRow } from './types'
import { FIGURES, type Figure } from './figures'
import { rowsFor } from './measures'
import { buildGroups, fmt, type Row } from '../charts/engine'
import { armInfo, vendorOf, modelLabel, modelOrder, type ArmInfo } from './roster'

export type Verdict = 'win' | 'loss' | 'tie' | 'none'

export type ScoreCell = {
  arm: ArmInfo
  models: string[]            // the shared roster the cell pools over
  ta: number | null           // Corograph's pooled value over that roster
  other: number | null        // the comparator's
  verdict: Verdict
  headline: string            // "+6.2 pts" · "0.35× the tokens" · "1.9–2.9× fewer"
  detail: string              // "95.6% vs 89.4% · 6 shared models"
  perModel?: { model: string; ta: number; other: number }[]   // vendor-split cells
}

export type ScoreRow = { fig: Figure; cells: ScoreCell[] }
export type Scorecard = {
  rows: ScoreRow[]
  comparators: ArmInfo[]      // column order
  tally: Record<string, { win: number; tie: number; loss: number }>
  slice: string
}

const SLICE = { exams: ['ZeroShotExam', 'MultiTurnExam'], battery: 'both' as const }

// The hard battery (Figure 3) and consistency (Figure 4) are figures of their
// own since 2026-09-14 — every scorecard row is a registry figure, and the
// card links carry distinct numbers.
const SCORECARD_FIGS = ['accuracy', 'accuracy-hard', 'pass-rate', 'consistency', 'context-tokens', 'tokens-per-correct', 'cost-per-correct', 'tool-calls', 'tool-result-tokens', 'wall-time']
const figFor = (slug: string): Figure => FIGURES.find(f => f.slug === slug)!
// the slice a scorecard row pools over: both batteries, except the hard-battery row
const sliceFor = (fig: Figure) => (fig.slug === 'accuracy-hard' ? { ...SLICE, battery: 'memos-hard' as const } : SLICE)

const TA = (id: string) => armInfo(id).role === 'corograph'

function pooled(fig: Figure, rows: Row[], models: string[], model: string | 'all') {
  const gs = buildGroups(fig, rows.filter(r => models.includes(r.model)), { ...sliceFor(fig), columns: 'pooled', model }, false)
  return gs
}

// spread statistics (sd, cv) are compared as ratios even though they print as %
const ratioLike = (fig: Figure) => fig.measure.unit !== 'pct' || fig.measure.cell === 'cv' || fig.measure.cell === 'sd'

function verdictOf(fig: Figure, ta: number, other: number): Verdict {
  const better = fig.measure.better
  if (!ratioLike(fig)) {
    const d = ta - other
    if (Math.abs(d) < 1) return 'tie'
    return (better === 'high' ? d > 0 : d < 0) ? 'win' : 'loss'
  }
  if (ta <= 0 || other <= 0) return 'none'
  const ratio = other / ta
  if (ratio > 0.95 && ratio < 1.05) return 'tie'
  return (better === 'low' ? ratio > 1 : ratio < 1) ? 'win' : 'loss'
}

const x = (r: number) => (r >= 10 ? r.toFixed(0) : r.toFixed(1)) + '×'

// PERCENT, NOT MULTIPLES (owner 2026-09-14): "1.4× fewer" makes a reader
// compute; "30% fewer" is the native unit of a saving. ratio = comparator ÷
// Corograph on a lower-is-better measure. saving(ratio) = what
// Corograph saves against the comparator, in %, signed: positive = uses
// less, negative = uses more. The strip's fine-print axis stays in multiples
// (it is the raw geometry); every sentence and delta is a percent.
const saving = (ratio: number) => (1 - 1 / ratio) * 100
const pct = (v: number) => `${Math.round(Math.abs(v))}%`
// a range of ratios as one percent phrase: "47–66% less" · "12–30% more" · "8% more to 40% less"
const savingRange = (lo: number, hi: number) => {
  const a = saving(lo), b = saving(hi)
  if (a >= 0 && b >= 0) return a === b || Math.round(a) === Math.round(b) ? `${pct(b)} less` : `${Math.round(a)}–${pct(b)} less`
  if (a <= 0 && b <= 0) return Math.round(a) === Math.round(b) ? `${pct(a)} more` : `${Math.round(Math.abs(b))}–${pct(a)} more`
  return `${pct(a)} more to ${pct(b)} less`
}

function cell(fig: Figure, rows: Row[], taId: string, other: ArmInfo): ScoreCell {
  const scored = (id: string) => new Set(rows.filter(r => r.arm === id && r.ok && r.score != null && SLICE.exams.includes(r.exam)).map(r => r.model))
  const shared = [...scored(taId)].filter(m => scored(other.id).has(m)).sort(modelOrder)
  const none: ScoreCell = { arm: other, models: shared, ta: null, other: null, verdict: 'none', headline: 'no shared model', detail: '' }
  if (!shared.length) return none
  const vendors = new Set(shared.map(vendorOf))
  const nModels = `${shared.length} shared model${shared.length === 1 ? '' : 's'}`

  // raw tokens over a multi-vendor roster: per model, reported as a range of ratios
  if (fig.measure.vendorBound && vendors.size > 1) {
    const per: { model: string; ta: number; other: number }[] = []
    for (const m of shared) {
      const gs = pooled(fig, rows, [m], m)
      const t = gs.find(g => g.arm.id === taId)?.pooled, o = gs.find(g => g.arm.id === other.id)?.pooled
      if (t != null && o != null) per.push({ model: m, ta: t, other: o })
    }
    if (!per.length) return none
    const ratios = per.map(p => p.other / p.ta)
    const lo = Math.min(...ratios), hi = Math.max(...ratios)
    const verdicts = per.map(p => verdictOf(fig, p.ta, p.other))
    const wins = verdicts.filter(v => v === 'win').length, losses = verdicts.filter(v => v === 'loss').length
    // a split roster earns a verdict only when every model agrees; otherwise it is mixed (shown as ≈)
    const verdict: Verdict = wins === per.length ? 'win' : losses === per.length ? 'loss' : 'tie'
    const headline = verdict === 'tie' && !(lo >= 1 || hi <= 1) ? `${savingRange(lo, hi)}, mixed by model` : savingRange(lo, hi)
    return { arm: other, models: shared, ta: null, other: null, verdict, headline, detail: `per model · ${nModels} · ${per.map(p => `${modelLabel(p.model)} ${fmt(fig, p.ta)} vs ${fmt(fig, p.other)}`).join('; ')}`, perModel: per }
  }

  const gs = pooled(fig, rows, shared, 'all')
  const t = gs.find(g => g.arm.id === taId)?.pooled ?? null, o = gs.find(g => g.arm.id === other.id)?.pooled ?? null
  if (t == null || o == null) return none
  const verdict = verdictOf(fig, t, o)
  const asRatio = ratioLike(fig)
  // the per-model pairs as well (the headlines quote the range at the same model)
  const perModel: { model: string; ta: number; other: number }[] = []
  for (const m of shared) {
    const g1 = pooled(fig, rows, [m], m)
    const a = g1.find(g => g.arm.id === taId)?.pooled, b = g1.find(g => g.arm.id === other.id)?.pooled
    if (a != null && b != null) perModel.push({ model: m, ta: a, other: b })
  }
  let headline: string
  if (!asRatio) {
    const d = t - o
    headline = `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts`
  } else {
    const ratio = o / t
    headline = verdict === 'tie' ? 'about the same' : savingRange(ratio, ratio)
  }
  return { arm: other, models: shared, ta: t, other: o, verdict, headline, detail: `${fmt(fig, t)} vs ${fmt(fig, o)} · ${nModels}`, perModel }
}

/**
 * The three headlines above the table — the one thing a reader takes away
 * if they read nothing else. Each is derived from the scorecard cells, so a
 * headline can never say something the table does not.
 */
// A ledger row also carries its two points on the card's axis (the gap strip):
// ta / cmp in axis units. A vendor-split row has no single comparator point;
// it carries the comparator's per-model range instead.
export type CardRow = { name: string; detail: string; delta: string; verdict: Verdict; ta: number | null; cmp: number | null; spanLo?: number; spanHi?: number }
export type Card = {
  category: string     // the one word the card is about: Accuracy · Reliability · Efficiency · Consistency (owner 2026-09-14)
  label: string        // the rest of the label: "context tokens", "hard battery"
  direction: string    // higher is better
  number: number       // the figure the card links to
  figure: string       // its slug
  headline: string     // the range statement
  sub: string          // one sentence of qualification
  rows: CardRow[]      // one per comparator
  tally: string        // "4 of 4 better"
  axis: { lo: number; hi: number; loLabel: string; hiLabel: string }   // zoomed to the card's own range
}

/**
 * The headline cards (the design handoff's editorial ledger, 2026-09-11):
 * one card per measure, a headline that holds against EVERY comparator, and
 * a ledger row per comparator (Claude Code, Codex, Cursor Agent, the best
 * indexing tool on that measure) so no reader has to ask "but what about X".
 * Every number is a scorecard cell; the card can never say what the table
 * does not. A headline range spans the comparators the verdict is a win
 * against; a mixed-by-model comparator is shown as ≈ and excluded.
 */
export function headlines(sc: Scorecard): Card[] {
  const row = (slug: string, short?: string) => sc.rows.find(r => r.fig.slug === slug && (!short || r.fig.short === short))
  const x = (r: number) => r.toFixed(1) + '×'
  const nameOf = (c: ScoreCell) => (c.arm.id === 'best-indexer' ? `${c.arm.short.replace('Best indexing tool: ', '')} (best indexer)` : c.arm.name.replace(' (bare)', ''))
  const shared = (c: ScoreCell) => `${c.models.length} shared model${c.models.length === 1 ? '' : 's'}`
  const ratioRange = (c: ScoreCell) => {
    const rs = (c.perModel ?? []).map(p => p.other / p.ta)
    return rs.length ? { lo: Math.min(...rs), hi: Math.max(...rs), n: rs.length } : null
  }
  const tallyOf = (rows: CardRow[]) => {
    const w = rows.filter(r => r.verdict === 'win').length, t = rows.filter(r => r.verdict === 'tie').length, n = rows.filter(r => r.verdict !== 'none').length
    return `${w} of ${n} better${t ? ` · ${t} ≈` : ''}`
  }
  const out: Card[] = []

  // an axis zoomed to the card's own points, snapped outward to a round step
  const axisOf = (rows: CardRow[], step: number, floor: number | null, label: (v: number) => string) => {
    const pts = rows.flatMap(r => [r.ta, r.cmp, r.spanLo ?? null, r.spanHi ?? null]).filter((v): v is number => v != null)
    let lo = Math.floor(Math.min(...pts) / step) * step, hi = Math.ceil(Math.max(...pts) / step) * step
    if (floor != null) lo = Math.max(floor, lo)
    if (hi <= lo) hi = lo + step
    return { lo, hi, loLabel: label(lo), hiLabel: label(hi) }
  }

  // points-delta cards (accuracy, reliability): delta = Corograph − comparator, in points; axis in %
  const pointsCard = (r: ScoreRow, category: string, label: string, headline: (lo: number, hi: number) => string, sub: string) => {
    const rows: CardRow[] = r.cells.map(c => ({
      name: nameOf(c), verdict: c.verdict, ta: c.ta, cmp: c.other,
      detail: c.ta != null && c.other != null ? `${c.ta.toFixed(1)}% vs ${c.other.toFixed(1)}% · ${shared(c)}` : 'no shared model',
      delta: c.ta != null && c.other != null ? `${c.ta - c.other >= 0 ? '+' : '−'}${Math.abs(c.ta - c.other).toFixed(1)} points` : '—',
    }))
    const leads = r.cells.filter(c => c.ta != null && c.other != null && c.verdict === 'win').map(c => c.ta! - c.other!)
    if (!leads.length) return
    out.push({ category, label, direction: 'higher is better', number: r.fig.number, figure: r.fig.slug, headline: headline(Math.min(...leads), Math.max(...leads)), sub, rows, tally: tallyOf(rows), axis: axisOf(rows, 5, 0, v => `${v}%`) })
  }
  // ratio cards (tokens, cost, spread): delta = Corograph's saving against the
  // comparator, in percent (1 − Corograph ÷ comparator). Axis: the comparator as a multiple
  // of Corograph (Corograph sits at 1×) — the only common scale when the
  // per-model magnitudes differ; a card whose values are already on one scale (the
  // spread %) plots the values themselves. The headline receives the saving range in
  // percent (lo, hi), already rounded.
  const ratioCard = (r: ScoreRow, category: string, label: string, headline: (lo: number, hi: number) => string, sub: (peak: number | null) => string, opts: { perModelDetail?: boolean; values?: boolean; plotValues?: boolean } = {}) => {
    const rows: CardRow[] = r.cells.map(c => {
      const rr = ratioRange(c)
      // a vendor-split cell (raw tokens over a two-vendor roster) has no pooled pair — it is its per-model range
      if (c.ta == null || c.other == null) {
        if (rr) return { name: nameOf(c), verdict: c.verdict, ta: 1, cmp: null, spanLo: rr.lo, spanHi: rr.hi, detail: `varies by model · ${shared(c)}`, delta: savingRange(rr.lo, rr.hi) }
        return { name: nameOf(c), verdict: c.verdict, ta: null, cmp: null, detail: 'no shared model', delta: '—' }
      }
      const ratio = c.other / c.ta
      const values = opts.values ? `${fmt(r.fig, c.ta)} vs ${fmt(r.fig, c.other)} · ` : ''
      const detail = opts.perModelDetail && rr ? `${values}${savingRange(rr.lo, rr.hi)} by model · ${shared(c)}` : `${values}${shared(c)}`
      const delta = c.verdict === 'tie' ? 'about equal' : savingRange(ratio, ratio)
      return { name: nameOf(c), verdict: c.verdict, ta: opts.plotValues ? c.ta : 1, cmp: opts.plotValues ? c.other : ratio, detail, delta }
    })
    const wins = r.cells.filter(c => c.verdict === 'win' && c.ta != null && c.other != null).map(c => c.other! / c.ta!)
    if (!wins.length) return
    const peaks = r.cells.map(ratioRange).filter((v): v is NonNullable<typeof v> => !!v).map(v => v.hi)
    const axis = opts.plotValues ? axisOf(rows, 1, 0, v => `${v}%`) : axisOf(rows, 0.5, 1, v => `${v}×`)
    const lo = Math.round(saving(Math.min(...wins))), hi = Math.round(saving(Math.max(...wins)))
    out.push({ category, label, direction: 'lower is better', number: r.fig.number, figure: r.fig.slug, headline: headline(lo, hi), sub: sub(peaks.length ? Math.round(saving(Math.max(...peaks))) : null), rows, tally: tallyOf(rows), axis })
  }
  const span = (lo: number, hi: number) => (lo === hi ? `${lo}%` : `${lo}–${hi}%`)

  // card ORDER (owner 2026-09-14): lower cost (context tokens) · hard battery ·
  // consistency · reliability · lower cost (per correct) · accuracy — the
  // token story opens, the overall accuracy closes.
  const acc = row('accuracy'), hard = row('accuracy-hard'), rel = row('pass-rate'), con = row('consistency'), ctx = row('context-tokens'), cost = row('cost-per-correct')
  // NOTES (owner 2026-09-14): short, standalone, inside the card's Details fold —
  // what the measure is and the one thing to notice; the headline stands alone.
  if (ctx) ratioCard(ctx, 'Efficiency', 'context tokens', (lo, hi) => `${span(lo, hi)} context token savings`, peak => `Every token the model read to answer a run: uncached input plus cache reads, over every call.${peak ? ` Up to ${peak}% at individual models.` : ''}`, { perModelDetail: true })
  if (hard) pointsCard(hard, 'Accuracy', 'hard battery', (lo, hi) => `${lo.toFixed(0)}–${hi.toFixed(0)} points more accurate on the hard battery`, 'The 20 questions text matching alone cannot answer: several components understood together, 5 with a false premise to refuse. Easy questions sit at the ceiling; here the tools separate.')
  if (con) ratioCard(con, 'Consistency', 'run-to-run variation', (lo, hi) => `${span(lo, hi)} less run-to-run variation`, () => 'Same tool, same model, same questions, run again. Coefficient of variation of run accuracy: lower means the result depends on the tool, not the run.', { values: true, plotValues: true })
  if (rel) pointsCard(rel, 'Reliability', 'runs at 90%+ accuracy', (lo, hi) => `${lo.toFixed(0)}–${hi.toFixed(0)} points more runs at 90%+ accuracy`, 'Share of runs scoring at least 9 in 10. How often a run lands in the top band, not how well the arm does on average.')
  if (cost) ratioCard(cost, 'Efficiency', 'cost per correct answer', (lo, hi) => `${span(lo, hi)} lower cost per correct answer`, () => 'USD per correct answer, vendor-reported where the harness reports it and otherwise estimated from published rate tables. The token saving, priced.', { values: true })
  if (acc) pointsCard(acc, 'Accuracy', 'all 50 questions', (lo, hi) => `${lo.toFixed(0)}–${hi.toFixed(0)} points more accurate over all 50 questions`, 'The 30 base questions most tools answer well plus the 20 hard ones. Easy questions pull every arm toward the ceiling, so the overall gap is narrower.')
  return out
}

/** Build the scorecard. Comparators: every bare harness, then the best indexer per measure. */
export function buildScorecard(runs: RunRow[]): Scorecard {
  const armIds = [...new Set(runs.map(r => r.arm))]
  const taId = armIds.find(TA)!
  const bare = armIds.filter(id => armInfo(id).role === 'bare').map(armInfo).sort((a, b) => a.id === 'cold' ? -1 : b.id === 'cold' ? 1 : a.short.localeCompare(b.short))
  const indexers = armIds.filter(id => armInfo(id).role === 'indexer').map(armInfo)
  const bestIndexer: ArmInfo = { id: 'best-indexer', name: 'Best indexing tool', role: 'indexer', color: '#8a8f9c', short: 'Best indexing tool', harness: 'Claude Code', index: 'best indexing tool' }
  const comparators = [...bare, bestIndexer]
  const rows: ScoreRow[] = []
  const tally: Scorecard['tally'] = {}
  for (const c of comparators) tally[c.id] = { win: 0, tie: 0, loss: 0 }
  for (const slug of SCORECARD_FIGS) {
    const fig = figFor(slug)
    const data = rowsFor(runs, fig.measure.key)
    const cells: ScoreCell[] = bare.map(b => cell(fig, data, taId, b))
    // the best indexer on THIS measure (its own shared roster with Corograph)
    const idx = indexers.map(i => cell(fig, data, taId, i)).filter(c => c.other != null)
    const best = idx.sort((a, b) => (fig.measure.better === 'high' ? b.other! - a.other! : a.other! - b.other!))[0]
    cells.push(best ? { ...best, arm: { ...bestIndexer, short: `Best indexing tool: ${best.arm.short}`, color: best.arm.color } } : { arm: bestIndexer, models: [], ta: null, other: null, verdict: 'none', headline: 'no shared model', detail: '' })
    rows.push({ fig, cells })
    cells.forEach((cl, i) => { const k = i < bare.length ? bare[i].id : bestIndexer.id; if (cl.verdict !== 'none') tally[k][cl.verdict]++ })
  }
  return { rows, comparators, tally, slice: 'ZeroShot + MultiTurn protocols · both batteries · shared models only' }
}
