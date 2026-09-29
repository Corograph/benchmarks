// Build-time construction of the category / difficulty heatmap: per arm, for
// one exam and one battery (or both), the pass rate over the questions
// carrying a category (or at a difficulty), pooled with equal weight over the
// arm's models.
import { armOrder, modelOrder, vendorOf } from './roster'
import { mean } from './stats'
import type { PerQuestion, Question } from './types'
import type { HeatData, HeatCell } from '../charts/Heatmap'

const DIFF = ['', 'difficulty 1', 'difficulty 2', 'difficulty 3', 'difficulty 4', 'difficulty 5']

/**
 * One heat variant per exam × battery × model selection. The selection is
 * 'all' (every model the arm ran), a vendor roster ('anthropic' | 'openai':
 * the arm's models of that vendor), or one model id — pooled with equal
 * weight over the models it admits. The model axis matters here more than
 * anywhere: pooled cells span each ARM'S OWN roster, and Corograph's
 * includes GPT models no comparison arm ran, so 'all' is not like for like;
 * a vendor roster or a single model is.
 */
export const HEAT_ROSTERS = ['anthropic', 'openai'] as const
export function buildHeat(pq: PerQuestion[], questions: Record<string, Question[]>, exam: string, battery: 'memos' | 'memos-hard' | 'both', model: string = 'all'): HeatData {
  const batteries = battery === 'both' ? ['memos', 'memos-hard'] : [battery]
  const meta = new Map<string, Question>()
  for (const b of batteries) for (const q of questions[b] ?? []) meta.set(b + '|' + q.qid, q)
  const cats = [...new Set([...meta.values()].flatMap(q => q.categories))].sort()
  const diffs = [...new Set([...meta.values()].map(q => q.difficulty))].sort((a, b) => a - b).map(d => DIFF[d] ?? `difficulty ${d}`)
  const admits = (m: string) => model === 'all' || m === model || ((HEAT_ROSTERS as readonly string[]).includes(model) && vendorOf(m) === model)
  const rows = pq.filter(r => r.exam === exam && batteries.includes(r.battery) && admits(r.model))
  const arms = [...new Set(rows.map(r => r.arm))].sort(armOrder)
  const cells: HeatCell[] = []
  const colKeys = [...cats.map(c => ({ col: c, test: (q: Question) => q.categories.includes(c) })),
    ...diffs.map(d => ({ col: d, test: (q: Question) => (DIFF[q.difficulty] ?? `difficulty ${q.difficulty}`) === d }))]
  for (const arm of arms) {
    const armRows = rows.filter(r => r.arm === arm)
    const models = [...new Set(armRows.map(r => r.model))].sort(modelOrder)
    for (const { col, test } of colKeys) {
      const perModel: number[] = []
      let pass = 0, n = 0
      for (const m of models) {
        let mp = 0, mn = 0
        for (const r of armRows) {
          if (r.model !== m) continue
          const q = meta.get(r.battery + '|' + r.qid)
          if (!q || !test(q)) continue
          mp += r.pass; mn += r.n
        }
        if (mn > 0) { perModel.push((100 * mp) / mn); pass += mp; n += mn }
      }
      // an arm that never ran this model has no cell (the chart draws the gap); keeps the page small
      if (perModel.length) cells.push({ arm, col, rate: mean(perModel), pass, n, models: perModel.length })
    }
  }
  return { exam, battery, model, columns: cats, difficulty: diffs, cells }
}

// Packed form for the island props: cells as [arm index, column index, rate,
// pass, n, models] tuples over shared arm/column tables (~4× smaller than the
// object form across the 80-odd exam × battery × model variants).
export type PackedHeat = { exam: string; battery: string; model: string; columns: string[]; difficulty: string[]; arms: string[]; cells: [number, number, number, number, number, number][] }

export function packHeat(h: HeatData): PackedHeat {
  const arms = [...new Set(h.cells.map(c => c.arm))]
  const cols = [...h.columns, ...h.difficulty]
  return {
    exam: h.exam, battery: h.battery, model: h.model, columns: h.columns, difficulty: h.difficulty, arms,
    cells: h.cells.filter(c => c.rate != null).map(c => [arms.indexOf(c.arm), cols.indexOf(c.col), Math.round(c.rate! * 100) / 100, c.pass, c.n, c.models]),
  }
}

export function unpackHeat(p: PackedHeat): HeatData {
  const cols = [...p.columns, ...p.difficulty]
  return { exam: p.exam, battery: p.battery, model: p.model, columns: p.columns, difficulty: p.difficulty,
    cells: p.cells.map(([a, c, rate, pass, n, models]) => ({ arm: p.arms[a], col: cols[c], rate, pass, n, models })) }
}
