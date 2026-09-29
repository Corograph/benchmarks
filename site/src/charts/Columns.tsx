import { useState } from 'react'
import type { Figure } from '../lib/figures'
import { fmt, fmtAxis, niceTicks, ordinal, spreadLabels, type Group, type RefLine, type Column } from './engine'
import { T, FONT_SANS, FONT_SERIF } from './theme'

export type Tip = { x: number; y: number; lines: string[] } | null

export function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null
  return (
    <div className="chart-tip" style={{ left: tip.x + 14, top: tip.y - 10 }}>
      {tip.lines.map((l, i) => <div key={i} className={i === 0 ? 'tip-head' : 'tip-line'}>{l}</div>)}
    </div>
  )
}

/**
 * Shared horizontal layout of groups → x positions. The chart FITS the panel:
 * spare width flows into column width (capped) and group gaps; a chart wider
 * than the panel shrinks its columns and gaps down to a floor before it is
 * ever allowed to scroll.
 */
export function layoutGroups(groups: Group[], panelW: number, colW = 36, gapIn = 6, gapGroup = 44, padL = 72, padR = 28) {
  const nCols = groups.reduce((a, g) => a + g.columns.length, 0)
  const nIn = groups.reduce((a, g) => a + Math.max(0, g.columns.length - 1), 0)
  const nGaps = Math.max(0, groups.length - 1)
  const naturalAt = (cw: number, gi: number, gg: number) => nCols * cw + nIn * gi + nGaps * gg + padL + padR
  let cw = colW, gi = gapIn, gg = gapGroup, lead = 0
  const natural = naturalAt(cw, gi, gg)
  if (panelW > natural && groups.length) {
    const grow = Math.min(58 - colW, ((panelW - natural) * 0.35) / Math.max(1, nCols))
    cw = colW + grow
    const after = naturalAt(cw, gi, 0)
    const share = (panelW - after) / Math.max(1, groups.length)
    gg = share
    lead = share / 2
  } else if (panelW < natural && groups.length) {
    // shrink: first the group gaps (to 16), then the in-group gaps (to 3),
    // then the columns (to 14) — proportionally, so the picture keeps its shape
    const minCw = 14, minGi = 3, minGg = 16
    const minimal = naturalAt(minCw, minGi, minGg)
    if (minimal < panelW) {
      const t = (panelW - minimal) / (natural - minimal) // 0 = minimal, 1 = natural
      cw = minCw + (colW - minCw) * t
      gi = minGi + (gapIn - minGi) * t
      gg = minGg + (gapGroup - minGg) * t
    } else {
      cw = minCw; gi = minGi; gg = minGg
    }
  }
  const width = Math.max(panelW, naturalAt(cw, gi, gg))
  const xs: { g: Group; x0: number; x1: number; cols: { c: Column; x: number }[] }[] = []
  let x = padL + lead
  for (const g of groups) {
    const cols = g.columns.map((c, i) => ({ c, x: x + i * (cw + gi) }))
    const w = g.columns.length * cw + (g.columns.length - 1) * gi
    xs.push({ g, x0: x, x1: x + w, cols })
    x += w + gg
  }
  return { xs, width, colW: cw, padL, padR }
}

/** A short model label for narrow columns. */
export const shortModel = (label: string) => label.replace('GPT 5.6 ', '').replace('Claude ', '').replace('Composer ', 'Comp ')

/** A group's slot is TIGHT when it cannot hold its name upright (phones). */
export const TIGHT_SLOT = 72

/** The by-model layout: every group is a model, every column an arm. */
export const isByModel = (groups: Group[]) => groups.some(g => g.model != null)

/** The label under a column: a model's short form in the by-arm layouts, the arm's name in the by-model layout. */
export const columnLabel = (g: Group, c: Column) => (g.model != null ? c.label : shortModel(c.label))

export function GroupFooter({ g, cx, y, rankTotal, slotW = 999 }: { g: Group; cx: number; y: number; rankTotal: number; slotW?: number }) {
  // tight slot (phones, portrait): the name turns 45° and the role + rank lines
  // yield — both are in the data table beneath the figure
  if (slotW < TIGHT_SLOT) {
    return (
      <text x={cx + 4} y={y - 6} textAnchor="end" fontSize={10.5} fontWeight={600} fill={T.ink} fontFamily={FONT_SERIF}
        transform={`rotate(-45 ${cx + 4} ${y - 6})`}>{g.head.title}</text>
    )
  }
  // the role line shortens when the group's slot cannot hold the long form
  const sub = slotW < 150 ? (g.head.subShort ?? g.head.sub) : g.head.sub
  // third line: the rank among arms (by-arm), else the group's note (by-model:
  // Corograph against the bare harness at this model)
  const note = slotW < 150 ? (g.noteShort ?? g.note) : g.note
  return (
    <g fontFamily={FONT_SANS}>
      <text x={cx} y={y} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={T.ink} fontFamily={FONT_SERIF}>{g.head.title}</text>
      <text x={cx} y={y + 14} textAnchor="middle" fontSize={9.5} fill={T.muted}>{sub}</text>
      {g.rank != null ? (
        <text x={cx} y={y + 29} textAnchor="middle" fontSize={9} fill={g.rank === 1 ? T.ink : T.muted} fontWeight={g.rank === 1 ? 700 : 500} letterSpacing={0.4}>
          {ordinal(g.rank)} of {rankTotal}
        </text>
      ) : note ? (
        <text x={cx} y={y + 29} textAnchor="middle" fontSize={9} fill={T.ink} fontWeight={700} letterSpacing={0.3}>{note}</text>
      ) : null}
    </g>
  )
}

export default function Columns({ fig, groups, refs, panelW }: { fig: Figure; groups: Group[]; refs: RefLine[]; panelW: number }) {
  const [tip, setTip] = useState<Tip>(null)
  // reference-line labels live in the right margin, never over the last group
  // a narrow panel gives the reference-line margin less room (labels shrink to match)
  const phone = panelW < 560
  // the by-model layout carries every arm inside every model group: tighter
  // columns and gaps so the whole field fits a panel without scrolling
  const byModel = isByModel(groups)
  const { xs, width, colW, padL, padR } = byModel
    ? layoutGroups(groups, panelW, 30, 4, 40, phone ? 56 : 72, 28)
    : layoutGroups(groups, panelW, 36, 6, 44, phone ? 56 : 72, refs.length ? (phone ? 78 : 104) : 28)
  // narrow = the column labels rotate (always, in the by-model layout: arm names are long)
  const narrow = (colW < 40 || byModel) && groups.some(g => g.columns.length > 1)
  const slotW = (i: number) => (i + 1 < xs.length ? (xs[i + 1].x0 + xs[i].x1) / 2 : width - padR) - (i > 0 ? (xs[i - 1].x1 + xs[i].x0) / 2 : padL)
  const tight = xs.some((_, i) => slotW(i) < TIGHT_SLOT)   // rotated group names need a deeper footer
  // a rotated label's vertical reach: the footer starts below the LONGEST one
  // (arm names in the by-model layout run to fourteen characters), never at a fixed offset
  const maxLabel = Math.max(0, ...groups.filter(g => g.columns.length > 1).flatMap(g => g.columns.map(c => columnLabel(g, c).length)))
  const footDrop = narrow ? Math.max(52, Math.ceil(maxLabel * 4.6 * 0.71) + 34) : 36
  const H = tight ? 540 : narrow ? 560 : 520, padT = colW < 30 ? 64 : 44, padB = tight ? 150 : narrow ? Math.max(118, footDrop + 52) : 96, plotH = H - padT - padB
  const vals = groups.flatMap(g => g.columns.map(c => c.value!)).concat(refs.map(r => r.value))
  const vmax = vals.length ? Math.max(...vals) * 1.12 : 1
  const vmin = Math.min(0, ...vals)
  const y = (v: number) => padT + plotH - ((v - vmin) / (vmax - vmin || 1)) * plotH
  const zero = y(0)
  // labels and the footer hang from the plot FLOOR, not the zero line: on a
  // figure with negative values (Cohen's d) the bars reach below zero
  const floor = padT + plotH
  const ticks = niceTicks(vmin, vmax, 5)
  const rankTotal = groups.filter(g => g.rank != null).length

  return (
    <div className="chart-wrap" onMouseLeave={() => setTip(null)}>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`${fig.title}: ${fig.measure.label}`}>
        {/* grid + axis */}
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={T.grid} strokeWidth={1} />
            <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={T.muted} fontFamily={FONT_SANS}>{fmtAxis(fig, t)}</text>
          </g>
        ))}
        <line x1={padL} x2={width - padR} y1={zero} y2={zero} stroke={T.baseline} strokeWidth={1} />
        {/* group dividers */}
        {xs.slice(1).map((s, i) => {
          const prev = xs[i]
          const xd = (prev.x1 + s.x0) / 2
          return <line key={'d' + i} x1={xd} x2={xd} y1={padT - 8} y2={floor + 6} stroke={T.grid} strokeDasharray="3 4" />
        })}
        {/* reference lines: true y for the line, spread y for the margin label */}
        {(() => { const ly = spreadLabels(refs.map(r => y(r.value))); return refs.map((r, i) => (
          <g key={'r' + i}>
            <line x1={padL} x2={width - padR} y1={y(r.value)} y2={y(r.value)} stroke={r.color} strokeDasharray="6 5" strokeWidth={1.2} opacity={0.85} />
            {ly[i] !== y(r.value) && <line x1={width - padR} x2={width - padR + 4} y1={y(r.value)} y2={ly[i]} stroke={r.color} strokeWidth={1} opacity={0.6} />}
            <text x={width - padR + 6} y={ly[i] + 3.5} textAnchor="start" fontSize={phone ? 8.5 : 9.5} fill={r.color} fontFamily={FONT_SANS}>{r.label} {fmt(fig, r.value)}</text>
          </g>
        )) })()}
        {/* columns */}
        {xs.map((s, gi) => (
          <g key={s.g.key}>
            {s.cols.map(({ c, x }) => {
              const v = c.value!
              const top = Math.min(y(v), zero), h = Math.abs(y(v) - zero)
              return (
                <g key={c.key}
                  onMouseMove={e => {
                    const r = (e.currentTarget.ownerSVGElement!.parentElement as HTMLElement).getBoundingClientRect()
                    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, lines: [
                      `${s.g.head.title} · ${c.label}`,
                      `${fmt(fig, v)} — ${fig.measure.label}`,
                      `n = ${c.n} runs in ${c.cells} cell${c.cells === 1 ? '' : 's'}`,
                      c.min != null && c.max != null ? `range ${fmt(fig, c.min)} – ${fmt(fig, c.max)}${c.sd != null ? ` · sd ${fmt(fig, c.sd)}` : ''}` : '',
                    ].filter(Boolean) })
                  }}>
                  <rect x={x} y={top} width={colW} height={Math.max(1, h)} rx={3} fill={c.color} />
                  {/* value label: upright when the column is wide enough, rotated when narrow — a rotated 9px label
                      needs ~10px of horizontal room, so it survives down to the 14px column floor (the by-model
                      layout at laptop widths; owner 2026-09-27: the labels were vanishing at zoom levels) */}
                  {colW >= 30 ? (
                    <text x={x + colW / 2} y={top - 6} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={T.ink} fontFamily={FONT_SANS}>
                      {c.best ? '★ ' : ''}{fmt(fig, v)}
                    </text>
                  ) : (
                    // a rotated label's glyphs hang left of its baseline: nudge the baseline right by half a cap height so the text centres on the column
                    <text x={x + colW / 2 + 3.2} y={top - 5} textAnchor="start" fontSize={9} fontWeight={600} fill={T.ink} fontFamily={FONT_SANS}
                      transform={`rotate(-90 ${x + colW / 2 + 3.2} ${top - 5})`}>{c.best ? '★' : ''}{fmt(fig, v)}</text>
                  )}
                  {(s.g.columns.length > 1 || c.models.length > 1) && (colW >= 40 && !byModel ? (
                    <text x={x + colW / 2} y={floor + 13} textAnchor="middle" fontSize={8.5} fill={T.muted} fontFamily={FONT_SANS}>{columnLabel(s.g, c)}</text>
                  ) : (
                    // arm names are long (CodebaseMemory): the by-model layout always rotates them
                    <text x={x + colW / 2 + 3} y={floor + 6} textAnchor="end" fontSize={8} fill={c.best && byModel ? T.ink : T.muted} fontWeight={c.best && byModel ? 700 : 400} fontFamily={FONT_SANS}
                      transform={`rotate(-45 ${x + colW / 2 + 3} ${floor + 6})`}>{columnLabel(s.g, c)}</text>
                  ))}
                </g>
              )
            })}
            <GroupFooter g={s.g} cx={(s.x0 + s.x1) / 2} y={floor + ((colW >= 40 && !byModel) || s.g.columns.length === 1 ? 36 : footDrop)} rankTotal={rankTotal} slotW={slotW(gi)} />
          </g>
        ))}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}
