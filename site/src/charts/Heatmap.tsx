import { useState } from 'react'
import { armInfo, armOrder, ROLE_LABEL } from '../lib/roster'
import { T, FONT_SANS, FONT_SERIF } from './theme'
import { Tooltip, type Tip } from './Columns'

export type HeatCell = { arm: string; col: string; rate: number | null; pass: number; n: number; models: number }
export type HeatData = { exam: string; battery: string; model: string; columns: string[]; difficulty: string[]; cells: HeatCell[] }

// Diverging color: which side of the baseline a cell sits on. The baseline is
// bare Claude Code's pass rate in the same column (the null hypothesis; the
// column mean when that row is absent). Above → the site's blue, below → a
// warm orange, at the baseline → neutral; equal steps per arm, no hue at the
// midpoint, and the number printed in every cell so color is never the only
// channel. (A green→red "traffic light" was considered and rejected: it is
// unreadable under red–green color vision deficiency and reserves status hues.)
const POLE = { light: { up: [37, 99, 200], down: [214, 112, 30], mid: [236, 237, 240] }, dark: { up: [104, 160, 255], down: [232, 140, 60], mid: [46, 48, 62] } }
function diverge(t: number, dark: boolean): string {
  const p = dark ? POLE.dark : POLE.light
  const to = t >= 0 ? p.up : p.down
  const k = Math.min(1, Math.abs(t))
  const c = p.mid.map((v, i) => Math.round(v + (to[i] - v) * k))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

export default function Heatmap({ data, panelW, dark }: { data: HeatData; panelW: number; dark: boolean }) {
  const [tip, setTip] = useState<Tip>(null)
  const arms = [...new Set(data.cells.map(c => c.arm))].sort(armOrder)
  const cols = [...data.columns, ...data.difficulty]
  const cell = (arm: string, col: string) => data.cells.find(c => c.arm === arm && c.col === col)
  // baseline per column: bare Claude Code, else the column mean over arms
  const baseArm = arms.find(a => a === 'cold')
  const baseline = (col: string): number | null => {
    if (baseArm) { const b = cell(baseArm, col); if (b && b.rate != null) return b.rate }
    const vs = arms.map(a => cell(a, col)?.rate).filter((v): v is number => v != null)
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null
  }
  const deltas = arms.flatMap(a => cols.map(col => { const c = cell(a, col), b = baseline(col); return c && c.rate != null && b != null ? c.rate - b : null })).filter((v): v is number => v != null)
  const span = Math.max(10, ...deltas.map(Math.abs))   // symmetric domain, at least ±10 points
  // vertical column labels; the top margin fits the longest one
  const longest = cols.reduce((a, c) => Math.max(a, c.length), 0)
  const labelW = 150, cellH = 34, padT = Math.min(150, 16 + Math.round(longest * 5.8)), padB = 44
  const cellW = Math.max(34, Math.min(96, (panelW - labelW - 24) / cols.length))
  const width = Math.max(panelW, labelW + cols.length * cellW + 24)
  const H = padT + arms.length * cellH + padB
  const legendY = padT + arms.length * cellH + 22
  return (
    <div className="chart-wrap" onMouseLeave={() => setTip(null)}>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label="pass rate by category and difficulty">
        {cols.map((col, j) => {
          const cx = labelW + j * cellW + cellW / 2 + 3.5, cy = padT - 8
          return (
            <text key={col} x={cx} y={cy} textAnchor="start" fontSize={9.5} fill={T.muted} fontFamily={FONT_SANS}
              transform={`rotate(-90 ${cx} ${cy})`}>{col}</text>
          )
        })}
        {data.difficulty.length > 0 && (
          <line x1={labelW + data.columns.length * cellW - 3} x2={labelW + data.columns.length * cellW - 3} y1={padT - 4} y2={padT + arms.length * cellH} stroke={T.baseline} strokeDasharray="3 4" />
        )}
        {arms.map((arm, i) => {
          const info = armInfo(arm)
          const yy = padT + i * cellH
          return (
            <g key={arm}>
              <rect x={0} y={yy + 6} width={4} height={cellH - 12} fill={info.color} rx={1} />
              <text x={12} y={yy + cellH / 2 - 2} fontSize={11.5} fontWeight={600} fill={T.ink} fontFamily={FONT_SERIF}>{info.short}</text>
              <text x={12} y={yy + cellH / 2 + 10} fontSize={8.5} fill={T.muted} fontFamily={FONT_SANS}>{ROLE_LABEL[info.role]}</text>
              {cols.map((col, j) => {
                const c = cell(arm, col)
                const x = labelW + j * cellW
                if (!c || c.rate == null) return <rect key={col} x={x + 1} y={yy + 1} width={cellW - 2} height={cellH - 2} fill={T.grid} rx={3} />
                const b = baseline(col)
                const d = b != null ? c.rate - b : 0
                const t = d / span
                const ink = Math.abs(t) > 0.55 ? '#ffffff' : T.ink
                const dLabel = b == null ? '' : d === 0 ? 'at the baseline' : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} points vs ${baseArm ? 'bare Claude Code' : 'the column mean'}`
                return (
                  <g key={col}
                    onMouseMove={e => {
                      const rc = (e.currentTarget.ownerSVGElement!.parentElement as HTMLElement).getBoundingClientRect()
                      setTip({ x: e.clientX - rc.left, y: e.clientY - rc.top, lines: [`${info.short} · ${col}`, `${c.rate.toFixed(1)}% of ${c.n} attempts`, dLabel, `${c.models} model${c.models === 1 ? '' : 's'} pooled`].filter(Boolean) })
                    }}>
                    <rect x={x + 1} y={yy + 1} width={cellW - 2} height={cellH - 2} fill={diverge(t, dark)} rx={3} />
                    <text x={x + cellW / 2} y={yy + cellH / 2 + 4} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={ink} fontFamily={FONT_SANS}>{c.rate.toFixed(0)}</text>
                  </g>
                )
              })}
            </g>
          )
        })}
        {/* legend: the diverging scale, labelled at both poles and the midpoint */}
        {(() => {
          const lx = labelW, lw = 200, steps = 20
          return (
            <g>
              {Array.from({ length: steps }, (_, i) => (
                <rect key={i} x={lx + (i * lw) / steps} y={legendY - 8} width={lw / steps + 0.5} height={10} fill={diverge(((i + 0.5) / steps) * 2 - 1, dark)} />
              ))}
              <text x={lx - 6} y={legendY} textAnchor="end" fontSize={9.5} fill={T.muted} fontFamily={FONT_SANS}>−{span.toFixed(0)} pts</text>
              <text x={lx + lw + 6} y={legendY} textAnchor="start" fontSize={9.5} fill={T.muted} fontFamily={FONT_SANS}>+{span.toFixed(0)} pts</text>
              <text x={lx + lw / 2} y={legendY + 14} textAnchor="middle" fontSize={9.5} fill={T.muted} fontFamily={FONT_SANS}>
                color = difference from {baseArm ? 'bare Claude Code' : 'the column mean'} in the same column · number = pass rate %
              </text>
            </g>
          )
        })()}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}
