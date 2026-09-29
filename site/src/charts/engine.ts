// The client-side engine every figure island shares: slicing, cell statistics
// on the compact rows, group/column construction, ranks and reference lines.
import { armInfo, armOrder, modelOrder, modelLabel, modelSub, vendorLabel, vendorOf, shade, ROLE_LABEL, ROLE_SHORT, type ArmInfo } from '../lib/roster'
import type { Figure, ColumnsMode, BatteryChoice } from '../lib/figures'
import { mean, sd } from '../lib/stats'

export type Row = {
  arm: string; model: string; exam: string; battery: string; rep: number; path: string
  denominator: number; score: number | null; fails: number | null; ok: boolean
  v: number | null       // the figure's per-run value (or accuracy for spread statistics)
  pct: number | null     // accuracy, always
}

export type Selection = { exams: string[]; battery: BatteryChoice; columns: ColumnsMode; model: string | 'all' }

export type Column = {
  key: string
  label: string           // sub-label under the column (a model, or the roster note)
  color: string
  value: number | null
  n: number               // scored runs behind the value
  cells: number
  min: number | null
  max: number | null
  sd: number | null
  models: string[]        // the models pooled into this column
  runs: Row[]             // the rows behind it (for dots / stacks / links)
  best?: boolean          // per-model winner (raw-token figures)
  rank?: number           // rank among every arm's column at this same model (single-model columns only)
  rankTotal?: number      // how many arms carry a column at this model
}

// What the footer prints under a group: its name, a role line (with a short
// form for tight slots) and the swatch colour the data table uses.
export type GroupHead = { title: string; sub: string; subShort?: string; color: string }

// A group is ONE arm (the by-arm layouts: pooled / per-model) or ONE model
// (the by-model transpose: every arm inside it, Corograph first).
export type Group = {
  key: string
  head: GroupHead
  arm?: ArmInfo           // by-arm layouts
  model?: string          // by-model layout
  columns: Column[]
  pooled: number | null   // group-level pooled value when licensed (single vendor or vendor-neutral measure)
  n: number
  rank: number | null
  note?: string           // footer line when the group carries no rank (by-model: Corograph against the bare harness at this model)
  noteShort?: string
}
export type ArmGroup = Group & { arm: ArmInfo }

const scoredRows = (rs: Row[]) => rs.filter(r => r.ok && r.score != null)

export function cellStat(fig: Figure, rows: Row[], reference: Row[]): number | null {
  const valid = scoredRows(rows)
  if (!valid.length) return null
  const kind = fig.measure.cell
  if (kind === 'mean') {
    const vals = valid.map(r => r.v).filter((v): v is number => v != null && isFinite(v))
    return vals.length ? mean(vals) : null
  }
  const ps = valid.map(r => r.pct).filter((v): v is number => v != null)
  switch (kind) {
    case 'sd': return sd(ps)
    case 'cv': { const m = mean(ps); return m > 0 ? (100 * sd(ps)) / m : null }
    case 'floor': return Math.min(...ps)
    case 'ceiling': return Math.max(...ps)
    case 'passrate90': return (100 * ps.filter(p => p >= 90).length) / ps.length
    case 'cohend': {
      const ref = scoredRows(reference).map(r => r.pct).filter((v): v is number => v != null)
      if (!ref.length || !ps.length) return null
      const s1 = sd(ps), s2 = sd(ref), n1 = ps.length, n2 = ref.length
      const pooled = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / Math.max(1, n1 + n2 - 2))
      return pooled > 0 ? (mean(ps) - mean(ref)) / pooled : 0
    }
  }
  return null
}

export function batteriesOf(sel: Selection): string[] {
  return sel.battery === 'both' ? ['memos', 'memos-hard'] : [sel.battery]
}

/**
 * Hierarchical pooling over battery × model × exam cells: each protocol is a
 * stratum, so a protocol with more runs can never outvote another.
 */
export function pooledStat(fig: Figure, rows: Row[], all: Row[], batteries: string[], models: string[], exams: string[]): { v: number | null; n: number; cells: number } {
  const vals: number[] = []
  let n = 0
  for (const b of batteries) for (const m of models) for (const e of exams) {
    const cell = rows.filter(r => r.battery === b && r.model === m && r.exam === e)
    if (!cell.length) continue
    const ref = all.filter(r => r.arm === 'cold' && r.battery === b && r.model === m && r.exam === e)
    const v = cellStat(fig, cell, ref)
    if (v != null && isFinite(v)) {
      vals.push(v)
      n += scoredRows(cell).length
    }
  }
  return { v: vals.length ? mean(vals) : null, n, cells: vals.length }
}

function column(fig: Figure, key: string, label: string, color: string, rows: Row[], all: Row[], batteries: string[], models: string[], exams: string[]): Column {
  const st = pooledStat(fig, rows, all, batteries, models, exams)
  const valid = scoredRows(rows).filter(r => models.includes(r.model) && batteries.includes(r.battery) && exams.includes(r.exam))
  const vals = (fig.measure.cell === 'mean' ? valid.map(r => r.v) : valid.map(r => r.pct)).filter((v): v is number => v != null && isFinite(v))
  return {
    key, label, color, value: st.v, n: st.n, cells: st.cells,
    min: vals.length ? Math.min(...vals) : null, max: vals.length ? Math.max(...vals) : null, sd: vals.length > 1 ? sd(vals) : null,
    models, runs: valid,
  }
}

/** Build the groups (one per arm) and their columns for a selection. */
export function buildGroups(fig: Figure, rows: Row[], sel: Selection, dark: boolean): ArmGroup[] {
  const exams = sel.exams
  const inExam = rows.filter(r => exams.includes(r.exam))
  const batteries = batteriesOf(sel)
  const arms = [...new Set(inExam.map(r => r.arm))].sort(armOrder)
  const groups: ArmGroup[] = []
  for (const armId of arms) {
    const info = armInfo(armId)
    const armRows = inExam.filter(r => r.arm === armId)
    const roster = [...new Set(scoredRows(armRows).filter(r => batteries.includes(r.battery) && r.v != null).map(r => r.model))].sort(modelOrder)
    const models = sel.model === 'all' ? roster : roster.filter(m => m === sel.model)
    if (!models.length) continue
    const vendors = new Set(models.map(vendorOf))
    // pooling licence: a vendor-bound measure never pools across vendors
    const mustSplit = fig.measure.vendorBound && vendors.size > 1
    const split = sel.columns !== 'pooled' || mustSplit
    let cols: Column[]
    if (split && models.length > 1) {
      cols = models.map((m, i) => column(fig, m, modelLabel(m), shade(info.color, i, models.length, dark), armRows.filter(r => r.model === m), inExam, batteries, [m], exams))
    } else {
      const label = models.length === 1 ? modelLabel(models[0]) : `${models.length} models`
      cols = [column(fig, 'pooled', label, info.color, armRows, inExam, batteries, models, exams)]
    }
    cols = cols.filter(c => c.value != null)
    if (!cols.length) continue
    const pooledV = mustSplit ? null : pooledStat(fig, armRows, inExam, batteries, models, exams).v
    groups.push({
      key: info.id, arm: info,
      head: { title: info.short, sub: ROLE_LABEL[info.role], subShort: ROLE_SHORT[info.role], color: info.color },
      columns: cols, pooled: pooledV, n: cols.reduce((a, c) => a + c.n, 0), rank: null,
    })
  }
  // ranks over groups that carry a licensed pooled value
  const ranked = groups.filter(g => g.pooled != null).sort((a, b) => fig.measure.better === 'high' ? b.pooled! - a.pooled! : a.pooled! - b.pooled!)
  ranked.forEach((g, i) => (g.rank = i + 1))
  // per-model ranks: every single-model column ranks against the same model across arms
  const byModel = new Map<string, Column[]>()
  for (const g of groups) for (const c of g.columns) {
    if (c.models.length !== 1 || c.value == null) continue
    const list = byModel.get(c.models[0]) ?? []
    list.push(c)
    byModel.set(c.models[0], list)
  }
  for (const list of byModel.values()) {
    list.sort((a, b) => fig.measure.better === 'high' ? b.value! - a.value! : a.value! - b.value!)
    list.forEach((c, i) => { c.rank = i + 1; c.rankTotal = list.length })
  }
  // per-model winners on vendor-bound measures (the honest rank for tokens)
  if (fig.measure.vendorBound) {
    const best = new Map<string, { g: Group; c: Column }>()
    for (const g of groups) for (const c of g.columns) {
      const m = c.models.length === 1 ? c.models[0] : null
      if (!m || c.value == null) continue
      const cur = best.get(m)
      if (!cur || (fig.measure.better === 'high' ? c.value > cur.c.value! : c.value < cur.c.value!)) best.set(m, { g, c })
    }
    for (const { c } of best.values()) c.best = true
  }
  return groups
}

/**
 * THE BY-MODEL LAYOUT (owner 2026-09-27): the transpose of per-model. One
 * group per MODEL, every arm inside it in roster order (Corograph · the
 * bare harnesses · the indexing tools), each column in its arm's identity
 * colour. The per-model view answers "how does one arm move across tiers";
 * this one answers "at THIS tier, Corograph against everyone" — the read
 * that used to take one glance per arm group now takes one glance per model.
 * Statistics are exactly the per-model columns (same cells, same ranks);
 * only the grouping changes. The footer carries Corograph against the
 * ecosystem's bare harness at that model, so the saving is printed, not
 * eyeballed.
 */
export function buildModelGroups(fig: Figure, rows: Row[], sel: Selection, dark: boolean): Group[] {
  const arms = buildGroups(fig, rows, { ...sel, columns: 'per-model' }, dark)
  const single = (c: Column) => c.models.length === 1
  const models = [...new Set(arms.flatMap(g => g.columns.filter(single).map(c => c.models[0])))].sort(modelOrder)
  const out: Group[] = []
  for (const m of models) {
    const columns: Column[] = []
    for (const g of arms) {
      const c = g.columns.find(c => single(c) && c.models[0] === m)
      if (!c || c.value == null) continue
      // the column becomes the ARM: identity colour, arm name, ★ on the winner at this model
      columns.push({ ...c, key: g.arm.id, label: g.arm.short, color: g.arm.color, best: c.rank === 1 })
    }
    if (!columns.length) continue
    const ta = columns.find(c => armInfo(c.key).role === 'corograph')
    const bare = columns.find(c => armInfo(c.key).role === 'bare')
    const note = ta && bare ? deltaNote(fig, ta, bare) : undefined
    out.push({
      key: m, model: m,
      head: { title: modelLabel(m), sub: modelSub(m), subShort: vendorLabel(m), color: '#8a8f9c' },
      columns, pooled: null, n: columns.reduce((a, c) => a + c.n, 0), rank: null,
      note: note?.long, noteShort: note?.short,
    })
  }
  return out
}

// Corograph against the bare harness at one model: points for a
// percentage or an effect size, a relative change for everything else.
function deltaNote(fig: Figure, ta: Column, bare: Column): { long: string; short: string } | undefined {
  if (ta.value == null || bare.value == null) return undefined
  const u = fig.measure.unit
  let d: string
  if (u === 'pct') d = `${ta.value - bare.value >= 0 ? '+' : '−'}${Math.abs(ta.value - bare.value).toFixed(1)} pts`
  else if (u === 'd') d = `${ta.value - bare.value >= 0 ? '+' : '−'}${Math.abs(ta.value - bare.value).toFixed(2)}`
  else {
    if (bare.value <= 0) return undefined
    const rel = (100 * (ta.value - bare.value)) / bare.value
    d = `${rel >= 0 ? '+' : '−'}${Math.abs(rel).toFixed(0)}%`
  }
  return { long: `Corograph ${d} vs ${bare.label}`, short: `CG ${d}` }
}

export type RefLine = { label: string; value: number; color: string }

/**
 * Dashed reference lines: Corograph and every bare harness at their pooled
 * values, so any column can be read against both the map and the null
 * hypotheses. A group whose pooled value is not licensed (a vendor-bound
 * measure over a multi-vendor roster) draws no line.
 */
export function referenceLines(fig: Figure, groups: Group[]): RefLine[] {
  if (fig.reference !== 'bare') return []
  // model groups carry no pooled value and no arm — the by-model layout draws
  // no reference lines (the bare harness is a column inside every group)
  return groups
    .filter((g): g is ArmGroup => !!g.arm && (g.arm.role === 'corograph' || g.arm.role === 'bare') && g.pooled != null)
    .map(g => ({ label: g.arm.short, value: g.pooled!, color: g.arm.color }))
}

/**
 * Label positions for the reference lines: the lines stay at their true y,
 * the labels in the margin are pushed apart so two nearby references (the map
 * beside a bare harness, say) stay legible. Returns one label y per ref, in
 * the refs' order.
 */
export function spreadLabels(ys: number[], minGap = 12): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  const out = ys.slice()
  let last = -Infinity
  for (const o of order) {
    const y = Math.max(o.y, last + minGap)
    out[o.i] = y
    last = y
  }
  return out
}

// ── formatting by unit ──
export function fmt(fig: Figure, v: number): string {
  switch (fig.measure.unit) {
    case 'tokens': return v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v.toFixed(0)
    case 'pct': return v.toFixed(1) + '%'
    case 'ms': return v >= 3600000 ? (v / 3600000).toFixed(1) + ' h' : v >= 60000 ? (v / 60000).toFixed(1) + ' min' : (v / 1000).toFixed(1) + ' s'
    case 'count': return v.toFixed(1)
    case 'd': return v.toFixed(2)
    // dollars: two decimals from $1 up; three below $1 so cost-per-correct values keep their resolution
    case 'usd': return '$' + (v >= 1 ? v.toFixed(2) : v.toFixed(3))
  }
}
export function fmtAxis(fig: Figure, v: number): string {
  switch (fig.measure.unit) {
    case 'tokens': return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v.toFixed(0)
    case 'pct': return v.toFixed(0)
    case 'ms': return v >= 60000 ? (v / 60000).toFixed(0) + 'm' : (v / 1000).toFixed(0) + 's'
    case 'count': return v.toFixed(0)
    case 'd': return v.toFixed(1)
    case 'usd': return '$' + (v >= 10 ? v.toFixed(0) : v.toFixed(2))
  }
}

export const ordinal = (n: number) => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th')

export function niceTicks(lo: number, hi: number, count = 5): number[] {
  const span = hi - lo || 1
  const step0 = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) ?? mag * 10
  const start = Math.ceil(lo / step) * step
  const out: number[] = []
  for (let t = start; t <= hi + 1e-9; t += step) out.push(+t.toFixed(10))
  return out
}
