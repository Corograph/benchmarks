// The statistics the figures use — the same definitions the benchmark's own
// application computes, restated here so the site can be read against the
// figure captions without any other source.
import type { RunRow } from './types'

export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
export const sd = (xs: number[]) => {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1))
}
export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const h = Math.floor(s.length / 2)
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2
}

/** Accuracy of one run in percent, null when unscored. */
export const pct = (r: RunRow) => (r.score != null && r.denominator > 0 ? (100 * r.score) / r.denominator : null)

/** Valid AND scored: the only runs that ever enter a mean. */
export const scored = (rs: RunRow[]) => rs.filter(r => r.validity_ok && r.score != null)

/** A per-run measure; null = the fact was not captured for that run (excluded, never zero). */
export type PerRun = (r: RunRow) => number | null

export const contextTokens: PerRun = r => r.tokens_input + r.tokens_cache_read
export const outputTokens: PerRun = r => r.tokens_output
export const allTokens: PerRun = r => r.tokens_input + r.tokens_cache_read + r.tokens_cache_write + r.tokens_output
export const wallMs: PerRun = r => (r.duration_ms ? r.duration_ms : null)
export const toolCalls: PerRun = r => r.tool_calls
export const llmCalls: PerRun = r => r.llm_calls ?? null
export const toolTimeMs: PerRun = r => r.tool_time_ms ?? null
export const perCorrect = (num: PerRun): PerRun => r => {
  const v = num(r)
  return r.score != null && r.score > 0 && v != null ? v / r.score : null
}
export const perQuestion = (num: PerRun): PerRun => r => {
  const v = num(r)
  return v != null && r.denominator > 0 ? v / r.denominator : null
}

/** Cell statistics over a set of scored runs (one arm × battery × model × exam). */
export type CellKind = 'mean' | 'sd' | 'cv' | 'floor' | 'ceiling' | 'passrate90' | 'cohend'

export function cellStat(kind: CellKind, per: PerRun | null, runs: RunRow[], reference?: RunRow[]): number | null {
  const valid = scored(runs)
  if (!valid.length) return null
  if (kind === 'mean') {
    const vals = valid.map(per!).filter((v): v is number => v != null && isFinite(v))
    return vals.length ? mean(vals) : null
  }
  const ps = valid.map(pct).filter((v): v is number => v != null)
  switch (kind) {
    case 'sd': return sd(ps)
    case 'cv': { const m = mean(ps); return m > 0 ? (100 * sd(ps)) / m : null }
    case 'floor': return Math.min(...ps)
    case 'ceiling': return Math.max(...ps)
    case 'passrate90': return (100 * ps.filter(p => p >= 90).length) / ps.length
    case 'cohend': {
      const ref = scored(reference ?? []).map(pct).filter((v): v is number => v != null)
      if (!ref.length || !ps.length) return null
      const s1 = sd(ps), s2 = sd(ref), n1 = ps.length, n2 = ref.length
      const pooled = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / Math.max(1, n1 + n2 - 2))
      return pooled > 0 ? (mean(ps) - mean(ref)) / pooled : 0
    }
  }
  return null
}

/**
 * Hierarchical pooling: the runs are partitioned into cells (battery × model ×
 * exam), the statistic is computed inside each cell, and the cell values are
 * averaged with equal weight. A battery with more runs, or a model run more
 * often, can never outvote another — model identity never masquerades as arm
 * effect. `n` is the number of scored runs behind the figure.
 */
export function pooled(kind: CellKind, per: PerRun | null, runs: RunRow[], reference: RunRow[],
  batteries: string[], models: string[], exams: string[]): { v: number | null; n: number; cells: number } {
  const cells: number[] = []
  let n = 0
  for (const b of batteries) for (const m of models) for (const e of exams) {
    const cell = runs.filter(r => r.battery === b && r.model === m && r.exam === e)
    if (!cell.length) continue
    const ref = reference.filter(r => r.battery === b && r.model === m && r.exam === e)
    const v = cellStat(kind, per, cell, ref)
    if (v != null && isFinite(v)) {
      cells.push(v)
      n += scored(cell).length
    }
  }
  return { v: cells.length ? mean(cells) : null, n, cells: cells.length }
}

// ── formatting ──
export const fmtM = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v.toFixed(0))
export const fmtPct = (v: number, d = 1) => v.toFixed(d) + '%'
export const fmtDur = (v: number) => (v >= 3600000 ? (v / 3600000).toFixed(1) + ' h' : v >= 60000 ? (v / 60000).toFixed(1) + ' min' : (v / 1000).toFixed(1) + ' s')
export const fmtNum = (v: number, d = 1) => v.toFixed(d)
export const fmtInt = (v: number) => Math.round(v).toLocaleString('en-US')
