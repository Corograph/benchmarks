// Figure 16 — organic index adoption. From adoption.json: per arm × model,
// the share of question runs that made at least one call to the arm's
// codebase index, pooled with equal weight over the selected protocol ×
// battery cells (the site's pooling law: no cell outvotes another).
import { armOrder, modelOrder } from './roster'
import type { AdoptionRow } from './types'

export type AdoptionPoint = {
  arm: string; model: string
  share: number | null          // % of question runs with ≥1 index call (equal-weight mean over cells)
  questions: number; withIndex: number; withoutTools: number
  indexCalls: number; setupCalls: number
  conversations: number; conversationsWithIndex: number
  cells: number
}

export function adoptionPoints(rows: AdoptionRow[], exams: string[], battery: 'memos' | 'memos-hard' | 'both'): AdoptionPoint[] {
  const batteries = battery === 'both' ? ['memos', 'memos-hard'] : [battery]
  const inSel = rows.filter(r => exams.includes(r.exam) && batteries.includes(r.battery))
  const arms = [...new Set(inSel.map(r => r.arm))].sort(armOrder)
  const models = [...new Set(inSel.map(r => r.model))].sort(modelOrder)
  const out: AdoptionPoint[] = []
  for (const arm of arms) for (const model of models) {
    const cells = inSel.filter(r => r.arm === arm && r.model === model && r.questions > 0)
    if (!cells.length) continue
    const shares = cells.map(c => (100 * c.questions_with_index) / c.questions)
    const sum = (k: keyof AdoptionRow) => cells.reduce((a, c) => a + (c[k] as number), 0)
    out.push({
      arm, model, share: shares.reduce((a, b) => a + b, 0) / shares.length,
      questions: sum('questions'), withIndex: sum('questions_with_index'), withoutTools: sum('questions_without_tools'),
      indexCalls: sum('index_calls'), setupCalls: sum('setup_calls'),
      conversations: sum('conversations'), conversationsWithIndex: sum('conversations_with_index'), cells: cells.length,
    })
  }
  return out
}

export const adoptionModels = (pts: AdoptionPoint[]) => [...new Set(pts.map(p => p.model))].sort(modelOrder)
export const adoptionArms = (pts: AdoptionPoint[]) => [...new Set(pts.map(p => p.arm))].sort(armOrder)
