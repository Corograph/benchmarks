import { useState } from 'react'
import { armInfo, modelLabel } from '../lib/roster'
import { adoptionArms, adoptionModels, type AdoptionPoint } from '../lib/adoption'
import { spreadLabels } from './engine'
import { Tooltip, shortModel, type Tip } from './Columns'
import { T, FONT_SANS } from './theme'

/**
 * One polyline per arm over the model axis (fast → frontier, the roster's
 * declared order): the share of question runs in which the harness called
 * the arm's codebase index. A model the arm never ran leaves a gap; the line
 * breaks rather than bridging it.
 */
export default function Lines({ points, panelW }: { points: AdoptionPoint[]; panelW: number }) {
  const [tip, setTip] = useState<Tip>(null)
  const phone = panelW < 560
  const arms = adoptionArms(points)
  const models = adoptionModels(points)
  const padL = phone ? 40 : 52, padR = phone ? 110 : 168, padT = 22, padB = phone ? 64 : 48
  const width = Math.max(panelW, padL + padR + models.length * (phone ? 64 : 90))
  const H = phone ? 380 : 440, plotH = H - padT - padB
  const x = (i: number) => padL + ((i + 0.5) / models.length) * (width - padL - padR)
  const y = (v: number) => padT + plotH - (v / 100) * plotH
  const at = (arm: string, model: string) => points.find(p => p.arm === arm && p.model === model)
  // end labels: at each arm's last point, spread so they never overlap
  const ends = arms.map(arm => {
    const last = [...models].reverse().find(m => at(arm, m)?.share != null)
    const p = last ? at(arm, last)! : null
    return { arm, p, yy: p ? y(p.share!) : NaN }
  }).filter(e => e.p)
  const labelY = spreadLabels(ends.map(e => e.yy), 13)
  const ticks = [0, 25, 50, 75, 100]

  return (
    <div className="chart-wrap" onMouseLeave={() => setTip(null)}>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label="index adoption per model, one line per arm">
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? T.baseline : T.grid} />
            <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill={T.muted} fontFamily={FONT_SANS}>{t}%</text>
          </g>
        ))}
        {models.map((m, i) => (
          phone ? (
            <text key={m} x={x(i) + 3} y={y(0) + 8} textAnchor="end" fontSize={9.5} fill={T.muted} fontFamily={FONT_SANS}
              transform={`rotate(-45 ${x(i) + 3} ${y(0) + 8})`}>{shortModel(modelLabel(m))}</text>
          ) : (
            <text key={m} x={x(i)} y={y(0) + 18} textAnchor="middle" fontSize={10.5} fill={T.muted} fontFamily={FONT_SANS}>{modelLabel(m)}</text>
          )
        ))}
        {!phone && <text x={(padL + width - padR) / 2} y={H - 8} textAnchor="middle" fontSize={9.5} fill={T.faint} fontFamily={FONT_SANS} letterSpacing={0.6}>MODEL · FAST → FRONTIER</text>}
        {arms.map(arm => {
          const info = armInfo(arm)
          const ta = info.role === 'corograph'
          // segments between consecutive models both present; a gap breaks the line
          const segs: string[] = []
          let cur: string[] = []
          models.forEach((m, i) => {
            const p = at(arm, m)
            if (p && p.share != null) cur.push(`${x(i)},${y(p.share)}`)
            else { if (cur.length > 1) segs.push(cur.join(' ')); cur = [] }
          })
          if (cur.length > 1) segs.push(cur.join(' '))
          return (
            <g key={arm}>
              {segs.map((d, i) => <polyline key={i} points={d} fill="none" stroke={info.color} strokeWidth={ta ? 2.6 : 1.8} strokeLinejoin="round" strokeLinecap="round" opacity={ta ? 1 : 0.9} />)}
              {models.map((m, i) => {
                const p = at(arm, m)
                if (!p || p.share == null) return null
                return (
                  <circle key={m} cx={x(i)} cy={y(p.share)} r={ta ? 4.5 : 3.6} fill={info.color} stroke={T.surface} strokeWidth={1.5}
                    onMouseMove={e => {
                      const rc = (e.currentTarget.ownerSVGElement!.parentElement as HTMLElement).getBoundingClientRect()
                      setTip({ x: e.clientX - rc.left, y: e.clientY - rc.top, lines: [
                        `${info.short} · ${modelLabel(m)}`,
                        `${p.share!.toFixed(0)}% of question runs called the index`,
                        `${p.withIndex} of ${p.questions} question runs · ${p.indexCalls} index calls`,
                        p.setupCalls ? `${p.setupCalls} setup calls excluded` : '',
                      ].filter(Boolean) })
                    }} />
                )
              })}
            </g>
          )
        })}
        {ends.map((e, i) => {
          const info = armInfo(e.arm)
          const x0 = width - padR + 8
          return (
            <g key={e.arm}>
              {Math.abs(labelY[i] - e.yy) > 1 && <line x1={width - padR + 2} x2={x0 - 2} y1={e.yy} y2={labelY[i]} stroke={info.color} strokeWidth={1} opacity={0.6} />}
              <text x={x0} y={labelY[i] + 3.5} textAnchor="start" fontSize={phone ? 9 : 10} fontWeight={info.role === 'corograph' ? 700 : 500} fill={info.color} fontFamily={FONT_SANS}>
                {info.short} {e.p!.share!.toFixed(0)}%
              </text>
            </g>
          )
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  )
}
