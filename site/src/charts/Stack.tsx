import { useState } from 'react'
import type { Figure } from '../lib/figures'
import { modelLabel, modelOrder, ROLE_LABEL } from '../lib/roster'
import { fmt, ordinal, type ArmGroup } from './engine'
import { Tooltip, shortModel, type Tip } from './Columns'
import { T, FONT_SANS, FONT_SERIF } from './theme'

// Every scored run = one thin column, three bands bottom-up: correct (arm
// color) · incorrect (dark) · unanswered/unjudged (black). Runs are ordered
// by model then repetition, with a labelled block per model. Always the
// by-arm layout: the island never hands this chart model groups.
export default function Stack({ fig, groups, panelW }: { fig: Figure; groups: ArmGroup[]; panelW: number }) {
  const [tip, setTip] = useState<Tip>(null)
  const H = 560, padT = 60, padB = 96, plotH = H - padT - padB, padL = 56, padR = 20
  const runsOf = (g: ArmGroup) => g.columns.flatMap(c => c.runs).sort((a, b) => modelOrder(a.model, b.model) || a.rep - b.rep)
  const total = groups.reduce((a, g) => a + runsOf(g).length, 0)
  let sw = 4
  const gapGroup = 36
  for (const w of [4, 3, 2.5, 2, 1.5, 1]) {
    sw = w
    if (total * w + gapGroup * (groups.length - 1) + padL + padR <= panelW) break
  }
  const natural = total * sw + gapGroup * (groups.length - 1) + padL + padR
  const width = Math.max(panelW, natural)
  const extra = Math.max(0, width - natural) / Math.max(1, groups.length)
  const y = (p: number) => padT + plotH - (p / 100) * plotH
  const ta = groups.find(g => g.arm.role === 'corograph')
  let x = padL + extra / 2
  const placed = groups.map(g => {
    const rs = runsOf(g)
    const x0 = x
    x += rs.length * sw + gapGroup + extra
    // contiguous blocks per model (the runs are model-sorted) for the sub-labels
    const blocks: { model: string; from: number; to: number }[] = []
    rs.forEach((r, i) => {
      const last = blocks[blocks.length - 1]
      if (last && last.model === r.model) last.to = i + 1
      else blocks.push({ model: r.model, from: i, to: i + 1 })
    })
    return { g, rs, x0, x1: x0 + rs.length * sw, blocks }
  })
  const multiModel = placed.some(p => p.blocks.length > 1)
  return (
    <div className="chart-wrap" onMouseLeave={() => setTip(null)}>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`${fig.title}: one column per run`}>
        {[0, 25, 50, 75, 100].map(t => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={T.grid} />
            <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={T.muted} fontFamily={FONT_SANS}>{t}</text>
          </g>
        ))}
        {placed.map(({ g, rs, x0, x1, blocks }, gi) => {
          const cx = (x0 + x1) / 2
          const delta = ta && g !== ta && g.pooled != null && ta.pooled != null ? g.pooled - ta.pooled : null
          const footY = y(0) + (multiModel ? 30 : 12)
          return (
            <g key={g.arm.id}>
              {gi > 0 && <line x1={x0 - (gapGroup + extra) / 2} x2={x0 - (gapGroup + extra) / 2} y1={padT - 20} y2={y(0) + 6} stroke={T.grid} strokeDasharray="3 4" />}
              {rs.map((r, i) => {
                const c = r.score!, inc = r.fails != null ? r.fails : r.denominator - c
                const d = Math.max(0, r.denominator - c - inc)
                const pc = (100 * c) / r.denominator, pi = (100 * inc) / r.denominator, pd = (100 * d) / r.denominator
                const xr = x0 + i * sw
                return (
                  <g key={r.path}
                    onMouseMove={e => {
                      const rc = (e.currentTarget.ownerSVGElement!.parentElement as HTMLElement).getBoundingClientRect()
                      setTip({ x: e.clientX - rc.left, y: e.clientY - rc.top, lines: [
                        `${g.arm.short} · ${modelLabel(r.model)} · rep ${r.rep}`,
                        `${c} correct · ${inc} incorrect · ${d} unanswered of ${r.denominator}`,
                        r.path,
                      ] })
                    }}>
                    <rect x={xr} y={y(pc)} width={sw} height={y(0) - y(pc)} fill={g.arm.color} />
                    <rect x={xr} y={y(pc + pi)} width={sw} height={y(pc) - y(pc + pi)} fill={T.incorrect} />
                    {pd > 0 && <rect x={xr} y={y(100)} width={sw} height={y(pc + pi) - y(100)} fill={T.dnf} />}
                  </g>
                )
              })}
              {g.pooled != null && (
                <text x={cx} y={padT - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill={T.ink} fontFamily={FONT_SANS}>{fmt(fig, g.pooled)}</text>
              )}
              {delta != null && (
                <text x={cx} y={y(40)} textAnchor="middle" fontSize={12} fontWeight={600} fill={T.ink} fontFamily={FONT_SANS}>
                  {delta >= 0 ? '+' : '−'}{Math.abs(delta).toFixed(1)}%
                </text>
              )}
              {/* per-model blocks: a tick between models and a short label under each block */}
              {multiModel && blocks.map((b, bi) => {
                const bx0 = x0 + b.from * sw, bx1 = x0 + b.to * sw, bw = bx1 - bx0
                const label = shortModel(modelLabel(b.model))
                return (
                  <g key={b.model}>
                    {bi > 0 && <line x1={bx0} x2={bx0} y1={y(0)} y2={y(0) + 8} stroke={T.baseline} />}
                    {bw >= 34 ? (
                      <text x={(bx0 + bx1) / 2} y={y(0) + 13} textAnchor="middle" fontSize={8} fill={T.muted} fontFamily={FONT_SANS}>{label}</text>
                    ) : (
                      <text x={(bx0 + bx1) / 2 + 3} y={y(0) + 6} textAnchor="end" fontSize={7.5} fill={T.muted} fontFamily={FONT_SANS}
                        transform={`rotate(-45 ${(bx0 + bx1) / 2 + 3} ${y(0) + 6})`}>{label}</text>
                    )}
                  </g>
                )
              })}
              <text x={cx} y={footY + 18} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={T.ink} fontFamily={FONT_SERIF}>{g.arm.short}</text>
              <text x={cx} y={footY + 32} textAnchor="middle" fontSize={9.5} fill={T.muted} fontFamily={FONT_SANS}>{ROLE_LABEL[g.arm.role]} · {rs.length} runs</text>
              {g.rank != null && (
                <text x={cx} y={footY + 47} textAnchor="middle" fontSize={9} fill={g.rank === 1 ? T.ink : T.muted} fontWeight={g.rank === 1 ? 700 : 500} fontFamily={FONT_SANS}>
                  {ordinal(g.rank)} of {groups.filter(h => h.rank != null).length}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}
