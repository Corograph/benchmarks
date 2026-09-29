import { useState } from 'react'
import type { Figure } from '../lib/figures'
import { modelLabel } from '../lib/roster'
import { fmt, fmtAxis, niceTicks, spreadLabels, type Group, type RefLine } from './engine'
import { layoutGroups, GroupFooter, Tooltip, columnLabel, isByModel, TIGHT_SLOT, type Tip } from './Columns'
import { T, FONT_SANS } from './theme'

// Deterministic jitter so the picture is identical on every render.
function jitter(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

export default function Dots({ fig, groups, refs, panelW }: { fig: Figure; groups: Group[]; refs: RefLine[]; panelW: number }) {
  const [tip, setTip] = useState<Tip>(null)
  const phone = panelW < 560
  const byModel = isByModel(groups)
  const { xs, width, colW, padL, padR } = byModel
    ? layoutGroups(groups, panelW, 34, 5, 40, phone ? 56 : 72, 28)
    : layoutGroups(groups, panelW, 44, 8, 44, phone ? 56 : 72, refs.length ? (phone ? 78 : 104) : 28)
  const narrow = colW < 40 && groups.some(g => g.columns.length > 1)
  // subRot = the labels UNDER the columns rotate: narrow columns, or the by-model layout (arm names are long)
  const subRot = narrow || (byModel && groups.some(g => g.columns.length > 1))
  const slotW = (i: number) => (i + 1 < xs.length ? (xs[i + 1].x0 + xs[i].x1) / 2 : width - padR) - (i > 0 ? (xs[i - 1].x1 + xs[i].x0) / 2 : padL)
  const tight = xs.some((_, i) => slotW(i) < TIGHT_SLOT)
  // narrow columns carry rotated labels above and below the whisker (max + mean above, min below),
  // so the top margin deepens and the plot keeps more headroom at both ends
  // a rotated label's vertical reach: the footer starts below the LONGEST one
  const maxLabel = Math.max(0, ...groups.filter(g => g.columns.length > 1).flatMap(g => g.columns.map(c => columnLabel(g, c).length)))
  const footDrop = subRot ? Math.max(52, Math.ceil(maxLabel * 4.6 * 0.71) + 34) : 36
  const H = tight ? 580 : subRot ? 600 : 540, padT = narrow ? 64 : 36, padB = tight ? 150 : subRot ? Math.max(118, footDrop + 52) : 96, plotH = H - padT - padB
  const all = groups.flatMap(g => g.columns.flatMap(c => c.runs.map(r => (fig.measure.cell === 'mean' ? r.v : r.pct)!)))
  const lo = all.length ? Math.min(...all) : 0, hi = all.length ? Math.max(...all) : 1
  const span = Math.max(hi - lo, Math.abs(hi) * 0.05, 1e-9)
  const vmin = lo - span * (narrow ? 0.2 : 0.08), vmax = hi + span * (narrow ? 0.18 : 0.12)
  const y = (v: number) => padT + plotH - ((v - vmin) / (vmax - vmin)) * plotH
  const ticks = niceTicks(vmin, vmax, 6)
  const rankTotal = groups.filter(g => g.rank != null).length
  const floor = padT + plotH

  return (
    <div className="chart-wrap" onMouseLeave={() => setTip(null)}>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`${fig.title}: every run as a dot`}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={T.grid} />
            <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={T.muted} fontFamily={FONT_SANS}>{fmtAxis(fig, t)}</text>
          </g>
        ))}
        {xs.slice(1).map((s, i) => {
          const xd = (xs[i].x1 + s.x0) / 2
          return <line key={'d' + i} x1={xd} x2={xd} y1={padT - 8} y2={floor + 6} stroke={T.grid} strokeDasharray="3 4" />
        })}
        {(() => { const ly = spreadLabels(refs.map(r => y(r.value))); return refs.map((r, i) => (
          <g key={'r' + i}>
            <line x1={padL} x2={width - padR} y1={y(r.value)} y2={y(r.value)} stroke={r.color} strokeDasharray="6 5" strokeWidth={1.2} opacity={0.85} />
            {ly[i] !== y(r.value) && <line x1={width - padR} x2={width - padR + 4} y1={y(r.value)} y2={ly[i]} stroke={r.color} strokeWidth={1} opacity={0.6} />}
            <text x={width - padR + 6} y={ly[i] + 3.5} textAnchor="start" fontSize={phone ? 8.5 : 9.5} fill={r.color} fontFamily={FONT_SANS}>{r.label} {fmt(fig, r.value)}</text>
          </g>
        )) })()}
        {xs.map((s, gi) => (
          <g key={s.g.key}>
            {s.cols.map(({ c, x }) => {
              const cx = x + colW / 2
              const vs = c.runs.map(r => (fig.measure.cell === 'mean' ? r.v : r.pct)!)
              const mn = Math.min(...vs), mx = Math.max(...vs)
              return (
                <g key={c.key}>
                  {c.runs.map((r, i) => {
                    const v = (fig.measure.cell === 'mean' ? r.v : r.pct)!
                    const jx = (jitter(i * 7 + c.key.length) - 0.5) * (colW - 12)
                    return (
                      <circle key={r.path} cx={cx + jx} cy={y(v)} r={4} fill={c.color} opacity={0.42} stroke={T.surface} strokeWidth={1}
                        onMouseMove={e => {
                          const rc = (e.currentTarget.ownerSVGElement!.parentElement as HTMLElement).getBoundingClientRect()
                          setTip({ x: e.clientX - rc.left, y: e.clientY - rc.top, lines: [
                            `${s.g.model != null ? c.label : s.g.head.title} · ${modelLabel(r.model)} · rep ${r.rep}`,
                            `${fmt(fig, v)} — ${r.score}/${r.denominator} correct`,
                            r.path,
                          ] })
                        }} />
                    )
                  })}
                  {/* the mean bar: ink (black in light mode, white in dark) with a thin surface halo,
                      drawn after the dots so it always reads on top of them */}
                  {/* the candlestick: the full min→max range in the arm's colour, drawn above the dots with caps at both ends */}
                  <line x1={cx} x2={cx} y1={y(mx)} y2={y(mn)} stroke={c.color} strokeWidth={1.4} opacity={0.95} />
                  <line x1={cx - 3} x2={cx + 3} y1={y(mx)} y2={y(mx)} stroke={c.color} strokeWidth={1.4} opacity={0.95} />
                  <line x1={cx - 3} x2={cx + 3} y1={y(mn)} y2={y(mn)} stroke={c.color} strokeWidth={1.4} opacity={0.95} />
                  {c.value != null && <line x1={x + 4} x2={x + colW - 4} y1={y(c.value)} y2={y(c.value)} stroke={T.surface} strokeWidth={3.4} />}
                  {c.value != null && <line x1={x + 4} x2={x + colW - 4} y1={y(c.value)} y2={y(c.value)} stroke={T.ink} strokeWidth={1.6} />}
                  {/* labels: wide columns set the mean beside its bar with min/max upright at the whisker ends;
                      narrow columns (per-model view) rotate everything — max in the arm's colour just above
                      the top dot, the mean in ink above that, min in the arm's colour hanging below the bottom dot.
                      A rotated label's glyphs hang left of its baseline, so the baseline is nudged right by
                      half a cap height to centre the text on the column. */}
                  {c.value != null && !narrow && (
                    <text x={x + colW + 3} y={y(c.value) + 3.5} fontSize={9.5} fontWeight={600} fill={T.ink} fontFamily={FONT_SANS}>{fmt(fig, c.value)}</text>
                  )}
                  {!narrow && <text x={cx} y={y(mn) + 12} textAnchor="middle" fontSize={8.5} fill={c.color} fontFamily={FONT_SANS}>{fmt(fig, mn)}</text>}
                  {!narrow && <text x={cx} y={y(mx) - 6} textAnchor="middle" fontSize={8.5} fill={c.color} fontFamily={FONT_SANS}>{fmt(fig, mx)}</text>}
                  {narrow && (() => {
                    const bx = cx + 3.0
                    return (
                      <>
                        {c.value != null && (
                          <text x={bx} y={y(mx) - 8} textAnchor="start" fontSize={9} fontWeight={600} fill={T.ink} fontFamily={FONT_SANS}
                            transform={`rotate(-90 ${bx} ${y(mx) - 8})`}>{fmt(fig, c.value)}</text>
                        )}
                        <text x={bx} y={y(mn) + 8} textAnchor="end" fontSize={8.5} fill={c.color} fontFamily={FONT_SANS}
                          transform={`rotate(-90 ${bx} ${y(mn) + 8})`}>{fmt(fig, mn)}</text>
                      </>
                    )
                  })()}
                  {s.g.columns.length > 1 && (!subRot ? (
                    <text x={cx} y={floor + 13} textAnchor="middle" fontSize={8.5} fill={T.muted} fontFamily={FONT_SANS}>{columnLabel(s.g, c)}</text>
                  ) : (
                    <text x={cx + 3} y={floor + 6} textAnchor="end" fontSize={8} fill={c.best && byModel ? T.ink : T.muted} fontWeight={c.best && byModel ? 700 : 400} fontFamily={FONT_SANS}
                      transform={`rotate(-45 ${cx + 3} ${floor + 6})`}>{columnLabel(s.g, c)}</text>
                  ))}
                </g>
              )
            })}
            <GroupFooter g={s.g} cx={(s.x0 + s.x1) / 2} y={floor + (!subRot || s.g.columns.length === 1 ? 36 : footDrop)} rankTotal={rankTotal} slotW={slotW(gi)} />
          </g>
        ))}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}
