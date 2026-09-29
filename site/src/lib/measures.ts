// Per-run measures by key — build-time only (RunRow → number | null). The
// client islands receive rows that already carry the value, packed as tuples
// so a figure page ships ~150 KB of data rather than a megabyte of keys.
import type { RunRow } from './types'
import type { MeasureKey } from './figures'
import { contextTokens, pct, perCorrect, toolCalls, wallMs, llmCalls, outputTokens, type PerRun } from './stats'
import type { Row } from '../charts/engine'

const costUSD: PerRun = r => r.cost_usd ?? null
const toolResultTokens: PerRun = r => r.tool_result_tokens ?? null

export const MEASURES: Record<MeasureKey, PerRun> = {
  ctx: contextTokens,
  ctx_per_correct: perCorrect(contextTokens),
  pct: pct,
  tool_calls: toolCalls,
  wall: wallMs,
  llm_calls: llmCalls,
  out_tokens: outputTokens,
  cost: costUSD,
  cost_per_correct: perCorrect(costUSD),
  tool_result_tokens: toolResultTokens,
  // Figure 16 is computed from adoption.json, not from run rows; the key exists so the registry type-checks
  adoption: () => null,
}

export function measureOf(key: MeasureKey): PerRun {
  return MEASURES[key]
}

/** Tuple form: [arm, model, exam, battery, rep, denominator, score, fails, ok, v, pct] */
export type Packed = [string, string, string, string, number, number, number | null, number | null, 0 | 1, number | null, number | null]

const round = (v: number | null) => (v == null ? null : Math.round(v * 10000) / 10000)

export const packRows = (runs: RunRow[], key: MeasureKey): Packed[] => {
  const per = measureOf(key)
  return runs.map(r => [r.arm, r.model, r.exam, r.battery, r.rep, r.denominator, r.score, r.fails, r.validity_ok ? 1 : 0,
    r.validity_ok && r.score != null ? round(per(r)) : null, round(pct(r))])
}

export const unpackRows = (packed: Packed[]): Row[] =>
  packed.map(([arm, model, exam, battery, rep, denominator, score, fails, ok, v, p]) => ({
    arm, model, exam, battery, rep, denominator, score, fails, ok: ok === 1, v, pct: p,
    path: `runs/${arm}/${model}/${exam}/${battery}/rep${String(rep).padStart(2, '0')}`,
  }))

/** Build-time convenience: full rows (for the summary's key results). */
export const rowsFor = (runs: RunRow[], key: MeasureKey): Row[] => unpackRows(packRows(runs, key))
