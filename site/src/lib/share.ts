// Shareable figure state — the URL form of a figure's controls (owner 2026-09-27:
// "a link to any graph view of any graph"). One short query string, readable
// enough to write by hand:
//
//   ?f=context-tokens&p=zs,mt&b=both&m=all&c=by-model#context-tokens
//
//   f  figure slug — the island whose slug matches applies the rest; every other
//      island on the page ignores the query (comparison pages carry several)
//   p  protocols, comma-separated: zs (ZeroShot) · mt (MultiTurn) · he (HumanExam);
//      a heatmap takes the first
//   b  battery: hard · base · both
//   m  model: all · a model id (claude-sonnet-5) · a vendor roster (anthropic, openai — heatmap)
//   c  columns: pooled · per-model · by-model (site-wide, remembered — a link sets it)
//
// The hash is the figure's anchor (comparison pages give every figure heading its
// slug as id; a results page has one figure and no anchor to find, harmless).
// Unknown or invalid values are ignored field by field; the figure's defaults
// stand in for whatever a link omits.
import type { BatteryChoice, ColumnsMode } from './figures'

export type ShareState = { exams: string[]; battery: BatteryChoice; model: string; columns?: ColumnsMode }

const EXAM_CODE: Record<string, string> = { ZeroShotExam: 'zs', MultiTurnExam: 'mt', HumanExam: 'he' }
const CODE_EXAM: Record<string, string> = Object.fromEntries(Object.entries(EXAM_CODE).map(([k, v]) => [v, k]))
const BATTERY_CODE: Record<BatteryChoice, string> = { 'memos-hard': 'hard', memos: 'base', both: 'both' }
const CODE_BATTERY: Record<string, BatteryChoice> = { hard: 'memos-hard', base: 'memos', both: 'both' }
const COLUMNS: ColumnsMode[] = ['pooled', 'per-model', 'by-model']

export function encodeShare(slug: string, s: ShareState): string {
  const q = new URLSearchParams()
  q.set('f', slug)
  q.set('p', s.exams.map(e => EXAM_CODE[e] ?? e).join(','))
  q.set('b', BATTERY_CODE[s.battery] ?? s.battery)
  q.set('m', s.model)
  if (s.columns) q.set('c', s.columns)
  // a literal comma between protocols: the link is meant to be readable and hand-written
  return '?' + q.toString().replace(/%2C/g, ',')
}

/** The state a link carries for THIS figure, field by field; null when the link is for another figure (or carries nothing). */
export function decodeShare(search: string, slug: string, validModels: string[]): Partial<ShareState> | null {
  const q = new URLSearchParams(search)
  if (q.get('f') !== slug) return null
  const out: Partial<ShareState> = {}
  const p = q.get('p')
  if (p) {
    const exams = p.split(',').map(x => CODE_EXAM[x.trim()] ?? x.trim()).filter(e => e in EXAM_CODE)
    if (exams.length) out.exams = [...new Set(exams)]
  }
  const b = q.get('b')
  if (b && b in CODE_BATTERY) out.battery = CODE_BATTERY[b]
  const m = q.get('m')
  if (m && (m === 'all' || validModels.includes(m))) out.model = m
  const c = q.get('c')
  if (c && (COLUMNS as string[]).includes(c)) out.columns = c as ColumnsMode
  return out
}

/** The full link for the current page: path + query + the figure's anchor. */
export function shareUrl(slug: string, s: ShareState): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}${encodeShare(slug, s)}#${slug}`
}
