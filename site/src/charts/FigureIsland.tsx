import { useEffect, useMemo, useRef, useState } from 'react'
import type { Figure, BatteryChoice, ColumnsMode } from '../lib/figures'
import { EXAMS, EXAM_LABEL, BATTERY_LABEL, modelLabel, modelOrder, vendorOf, runUrl, ROLE_LABEL, armInfo } from '../lib/roster'
import { buildGroups, buildModelGroups, referenceLines, fmt, ordinal, type Selection, type Group, type ArmGroup } from './engine'
import { unpackRows, type Packed } from '../lib/measures'
import { decodeShare, encodeShare, shareUrl } from '../lib/share'
import Columns from './Columns'
import Dots from './Dots'
import Stack from './Stack'
import Heatmap from './Heatmap'
import Lines from './Lines'
import { unpackHeat, HEAT_ROSTERS, type PackedHeat } from '../lib/heat'
import { adoptionPoints, type AdoptionPoint } from '../lib/adoption'
import type { AdoptionRow } from '../lib/types'

function useTheme(): boolean {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const read = () => setDark(el.dataset.theme === 'dark')
    read()
    const mo = new MutationObserver(read)
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return dark
}

/**
 * A site-wide, remembered preference: read from localStorage after mount
 * (the server render uses the fallback), written on change, and broadcast to
 * every other island on the page so one control moves every figure.
 */
function useSitePref<T extends string>(key: string, fallback: T, valid: readonly T[]): [T, (v: T) => void] {
  const [v, setV] = useState<T>(fallback)
  const storeKey = 'cg-pref:' + key
  useEffect(() => {
    const read = () => { try { const s = localStorage.getItem(storeKey); if (s && (valid as readonly string[]).includes(s)) setV(s as T) } catch {} }
    read()
    const onLocal = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.key === key) setV(d.value as T) }
    const onStorage = (e: StorageEvent) => { if (e.key === storeKey) read() }
    window.addEventListener('cg-pref', onLocal)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('cg-pref', onLocal); window.removeEventListener('storage', onStorage) }
  }, [key])
  const set = (nv: T) => {
    setV(nv)
    try { localStorage.setItem(storeKey, nv) } catch {}
    window.dispatchEvent(new CustomEvent('cg-pref', { detail: { key, value: nv } }))
  }
  return [v, set]
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(960)
  useEffect(() => {
    if (!ref.current) return
    // the chart lays out for the panel it actually has (a phone is ~340px); below
    // 300 the layout floors and the panel scrolls
    const ro = new ResizeObserver(es => { for (const e of es) setW(Math.max(300, e.contentRect.width)) })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

function Seg<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: { v: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup" aria-label={name}>
      <span className="seg-name">{name}</span>
      {options.map(o => (
        <button key={o.v} type="button" role="radio" aria-checked={o.v === value} disabled={o.disabled} data-value={o.v}
          className={'seg-btn' + (o.v === value ? ' on' : '')} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  )
}

// the arm behind a column: the group's arm (by-arm layouts) or the column's own (by-model)
const armOfColumn = (g: Group, c: { key: string }) => g.arm ?? armInfo(c.key)

function csvOf(fig: Figure, groups: Group[]): string {
  const head = ['arm', 'role', 'columns_label', 'models', 'value', 'unit', 'n_runs', 'cells', 'min', 'max', 'sd', 'rank', 'rank_of', 'rank_scope']
  const lines = [head.join(',')]
  const rankTotal = groups.filter(g => g.rank != null).length
  for (const g of groups) for (const c of g.columns) {
    // a split group ranks each column against the same model across arms; an unsplit group carries the arm's pooled rank
    const split = g.columns.length > 1 || g.model != null
    const rank = split ? c.rank : g.rank
    const of = split ? c.rankTotal : rankTotal
    const arm = armOfColumn(g, c)
    lines.push([arm.short, arm.role, c.label, c.models.join(' '), c.value?.toFixed(4) ?? '', fig.measure.unit, c.n, c.cells,
      c.min?.toFixed(4) ?? '', c.max?.toFixed(4) ?? '', c.sd?.toFixed(4) ?? '', rank ?? '', rank != null ? of : '', split ? 'at this model' : 'pooled models'].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  }
  return lines.join('\n') + '\n'
}

function adoptionCsv(pts: AdoptionPoint[]): string {
  const head = ['arm', 'model', 'share_pct', 'questions', 'questions_with_index', 'index_calls', 'setup_calls_excluded', 'questions_without_tools', 'conversations', 'conversations_with_index', 'cells']
  const lines = [head.join(',')]
  for (const p of pts) lines.push([p.arm, p.model, p.share?.toFixed(2) ?? '', p.questions, p.withIndex, p.indexCalls, p.setupCalls, p.withoutTools, p.conversations, p.conversationsWithIndex, p.cells].join(','))
  return lines.join('\n') + '\n'
}

export default function FigureIsland({ fig, data, heat, adoption, compact, controls, table }: {
  fig: Figure; data: Packed[]; heat?: PackedHeat[]; adoption?: AdoptionRow[]
  compact?: boolean        // summary use: no controls, no table
  controls?: boolean       // explicit overrides
  table?: boolean
}) {
  const showControls = controls ?? !compact
  const showTable = table ?? !compact
  const dark = useTheme()
  const [ref, panelW] = useWidth<HTMLDivElement>()
  const rows = useMemo(() => unpackRows(data), [data])
  const [local, setLocal] = useState<Omit<Selection, 'columns'>>({ exams: fig.defaults.exams, battery: fig.defaults.battery, model: fig.defaults.model ?? 'all' })
  // the columns choice is site-wide (pooled first); a locked figure ignores it —
  // except that a per-model lock still admits the by-model transpose (both are
  // one column per model; only the grouping differs)
  const [columnsPref, setColumnsPref] = useSitePref<ColumnsMode>('columns', 'pooled', ['pooled', 'per-model', 'by-model'])
  const columns: ColumnsMode = fig.lockColumns == null ? columnsPref
    : fig.lockColumns === 'per-model' && columnsPref === 'by-model' ? 'by-model'
    : fig.lockColumns
  const sel: Selection = { ...local, columns }
  const setSel = (f: (s: Selection) => Selection) => setLocal(s => { const n = f({ ...s, columns }); return { exams: n.exams, battery: n.battery, model: n.model } })
  const models = useMemo(() => (fig.kind === 'heatmap'
    ? [...new Set((heat ?? []).map(h => h.model).filter(m => m !== 'all' && !(HEAT_ROSTERS as readonly string[]).includes(m)))]
    : [...new Set(rows.filter(r => r.ok && r.score != null).map(r => r.model))]).sort(modelOrder), [rows, heat, fig.kind])
  // vendor rosters offered by the heatmap (only those present in the data)
  const rosters = useMemo(() => (fig.kind === 'heatmap' ? HEAT_ROSTERS.filter(v => (heat ?? []).some(h => h.model === v)) : []), [heat, fig.kind])
  const ROSTER_LABEL: Record<string, string> = { anthropic: 'Anthropic models', openai: 'OpenAI models' }
  const modelChoiceLabel = (m: string) => (m === 'all' ? 'all models' : ROSTER_LABEL[m] ?? modelLabel(m))

  // ── SHARE LINKS (owner 2026-09-27): a link carries this figure's controls ──
  // On mount, a query addressed to this figure (?f=<slug>) sets the controls it
  // names (lib/share.ts documents the form); the site-wide columns choice is set
  // too, so the link shows the view it was copied from. The share control copies
  // the link for the CURRENT controls, so changing a control changes the link.
  const validModels = useMemo(() => [...models, ...rosters], [models, rosters])
  useEffect(() => {
    const s = decodeShare(window.location.search, fig.slug, validModels)
    if (!s) return
    setLocal(cur => ({
      exams: s.exams ? (fig.kind === 'heatmap' ? [s.exams[0]] : fig.kind === 'lines' ? s.exams.filter(e => e !== 'HumanExam') : s.exams) : cur.exams,
      battery: s.battery ?? cur.battery,
      model: s.model ?? cur.model,
    }))
    if (s.columns && !(fig.lockColumns && fig.lockColumns !== 'per-model')) setColumnsPref(s.columns)
  // once, after the roster is known
  }, [validModels.length])
  const shareState = () => ({ exams: sel.exams, battery: sel.battery, model: sel.model, columns: fig.kind === 'columns' || fig.kind === 'dots' ? columns : undefined })
  // a results page holds ONE figure: its address bar follows the controls, so the
  // URL is always the link (comparison pages carry several figures and stay put)
  useEffect(() => {
    if (!showControls || !window.location.pathname.includes(`/results/${fig.slug}/`)) return
    try { history.replaceState(null, '', encodeShare(fig.slug, shareState()) + window.location.hash) } catch {}
  }, [local, columns])
  const [shareMsg, setShareMsg] = useState('')
  const copyShare = async () => {
    const url = shareUrl(fig.slug, shareState())
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('link copied')
    } catch {
      // no clipboard permission (older browsers, insecure contexts): put the link where it can be selected
      window.prompt('Copy this link', url)
      setShareMsg('')
    }
    setTimeout(() => setShareMsg(''), 2500)
  }
  // the stack is per run and always by arm; every other grouped figure follows the columns choice
  const armGroups = useMemo<ArmGroup[]>(() => (fig.kind === 'heatmap' || fig.kind === 'lines' || (fig.kind !== 'stack' && columns === 'by-model') ? [] : buildGroups(fig, rows, sel, dark)), [fig, rows, local, columns, dark])
  const groups = useMemo<Group[]>(() => (fig.kind === 'columns' || fig.kind === 'dots') && columns === 'by-model' ? buildModelGroups(fig, rows, sel, dark) : armGroups, [fig, rows, local, columns, dark, armGroups])
  const byModel = columns === 'by-model' && (fig.kind === 'columns' || fig.kind === 'dots')
  const refs = useMemo(() => referenceLines(fig, groups), [fig, groups])
  // the adoption lines: per arm × model over the selected protocol × battery cells
  const points = useMemo(() => (fig.kind === 'lines' ? adoptionPoints(adoption ?? [], sel.exams, sel.battery) : []), [fig.kind, adoption, local])
  // the heatmap is per protocol: it follows the first selected protocol
  const heatPacked = heat?.find(h => h.exam === sel.exams[0] && h.battery === (sel.battery === 'both' ? 'both' : sel.battery) && h.model === sel.model) ?? heat?.[0]
  const heatNow = useMemo(() => (heatPacked ? unpackHeat(heatPacked) : undefined), [heatPacked])
  const toggleExam = (e: string) => setSel(s => ({ ...s, exams: s.exams.includes(e) ? (s.exams.length > 1 ? s.exams.filter(x => x !== e) : s.exams) : EXAMS.filter(x => x === e || s.exams.includes(x)) }))
  const vendorsSel = sel.model === 'all' ? new Set(models.map(vendorOf)) : new Set([vendorOf(sel.model)])
  const pooledBlocked = !!fig.measure.vendorBound && vendorsSel.size > 1

  const download = (name: string, mime: string, body: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([body], { type: mime }))
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const downloadSVG = () => {
    const svg = ref.current?.querySelector('svg')
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    // bake the CSS variables so the file stands alone
    const cs = getComputedStyle(document.documentElement)
    const vars = ['--ink', '--muted', '--faint', '--grid', '--baseline', '--surface', '--accent', '--stack-incorrect', '--stack-dnf']
    let xml = new XMLSerializer().serializeToString(clone)
    for (const v of vars) xml = xml.split(`var(${v})`).join(cs.getPropertyValue(v).trim())
    xml = xml.replace('<svg', `<svg xmlns="http://www.w3.org/2000/svg" style="background:${cs.getPropertyValue('--surface').trim()}"`)
    download(`figure-${fig.number}-${fig.slug}-${sel.exams.join('+')}-${sel.battery}.svg`, 'image/svg+xml', xml)
  }

  const rankTotal = groups.filter(g => g.rank != null).length
  const nColumns = groups.reduce((a, g) => a + g.columns.length, 0)
  const busy = columns !== 'pooled' && !fig.lockColumns && !pooledBlocked && nColumns >= 12
  const examsLabel = fig.kind === 'heatmap' ? EXAM_LABEL[sel.exams[0]] : sel.exams.map(e => EXAM_LABEL[e]).join(' + ')
  const slice = `${examsLabel} · ${sel.battery === 'both' ? 'both batteries' : BATTERY_LABEL[sel.battery]}${sel.model !== 'all' ? ' · ' + modelChoiceLabel(sel.model) : ''}`

  return (
    <div className="figure" ref={ref} data-figure={fig.slug}>
      {showControls && (
        <div className="controls">
          {fig.kind === 'heatmap' ? (
            <Seg name="protocol" value={sel.exams[0]} options={EXAMS.map(e => ({ v: e, label: EXAM_LABEL[e] }))} onChange={exam => setSel(s => ({ ...s, exams: [exam] }))} />
          ) : (
            <div className="seg" role="group" aria-label="protocols">
              <span className="seg-name">protocols</span>
              {EXAMS.filter(e => fig.kind !== 'lines' || e !== 'HumanExam').map(e => (
                <button key={e} type="button" role="checkbox" aria-checked={sel.exams.includes(e)} data-value={e}
                  className={'seg-btn' + (sel.exams.includes(e) ? ' on' : '')} onClick={() => toggleExam(e)}>{EXAM_LABEL[e]}</button>
              ))}
            </div>
          )}
          <Seg<BatteryChoice> name="battery" value={sel.battery}
            options={[{ v: 'memos-hard', label: 'hard (20 q)' }, { v: 'memos', label: 'base (30 q)' }, { v: 'both', label: 'both' }]}
            onChange={battery => setSel(s => ({ ...s, battery }))} />
          {fig.kind !== 'lines' && (
            <Seg name="model" value={sel.model}
              options={[{ v: 'all', label: 'all' }, ...rosters.map(v => ({ v, label: ROSTER_LABEL[v] })), ...models.map(m => ({ v: m, label: modelLabel(m) }))]}
              onChange={model => setSel(s => ({ ...s, model }))} />
          )}
          {fig.kind === 'lines' && (
            <p className="seg-help">
              Every model is on the horizontal axis. Protocols pool with equal weight per protocol × battery cell; pick one protocol to read it alone.
              <b> MultiTurn</b> is one conversation per battery, so its per-question share is lower by construction; the table carries the per-conversation figure.
            </p>
          )}
          {fig.kind === 'heatmap' && (
            <p className="seg-help">
              {sel.model === 'all'
                ? <>With <b>all</b> models each cell pools the arm's own roster, and Corograph's roster includes GPT models no comparison arm ran, so its pooled cells are not like for like. A vendor roster or a single model compares arms over the same models.</>
                : rosters.includes(sel.model as any)
                  ? <>Each cell pools the arm's <b>{modelChoiceLabel(sel.model)}</b> with equal weight per model, so every arm is compared over the same vendor's models; an arm that ran none of them shows a gap.</>
                  : <>Each cell is the arm's pass rate at <b>{modelChoiceLabel(sel.model)}</b> alone.</>}
            </p>
          )}
          {fig.kind !== 'heatmap' && fig.kind !== 'stack' && !fig.lockColumns && (
            <>
              <Seg<ColumnsMode> name="columns" value={columns}
                options={[
                  { v: 'pooled', label: 'pooled models', disabled: pooledBlocked },
                  { v: 'per-model', label: 'per model' },
                  { v: 'by-model', label: 'by model' },
                ]}
                onChange={setColumnsPref} />
              <p className="seg-help">
                <b>Pooled models</b> shows one column per arm, its models averaged with equal weight — the readable overview.
                <b> Per model</b> shows one column per model for every arm, grouped by arm, for how one arm moves across tiers.
                <b> By model</b> is the transpose: one group per model with every arm inside it, Corograph first, for the like-for-like read at each tier at a glance; the line under each group is Corograph against that ecosystem's bare harness.
                This choice applies to every figure on the site and is remembered.
              </p>
              {busy && (
                <p className="seg-nudge" role="status">
                  This figure has {nColumns} columns in the {columns === 'by-model' ? 'by-model' : 'per-model'} view.
                  <button type="button" onClick={() => setColumnsPref('pooled')}>Show pooled models</button>
                  for one column per arm.
                </p>
              )}
            </>
          )}
          {fig.lockColumns === 'per-model' && (fig.kind === 'columns' || fig.kind === 'dots') && (
            <>
              <Seg<ColumnsMode> name="columns" value={columns}
                options={[{ v: 'per-model', label: 'per model' }, { v: 'by-model', label: 'by model' }]}
                onChange={setColumnsPref} />
              <p className="seg-help">This figure is always one column per model. <b>Per model</b> groups the columns by arm; <b>by model</b> groups them by model with every arm inside, Corograph first. The pooled-models choice does not apply to it.</p>
            </>
          )}
          {fig.lockColumns && fig.lockColumns !== 'per-model' && fig.kind !== 'heatmap' && fig.kind !== 'stack' && fig.kind !== 'lines' && (
            <p className="seg-help">This figure is always one column per arm; the site-wide columns choice does not apply to it.</p>
          )}
        </div>
      )}
      <div className="chart-head">
        <span className="chart-title">{fig.title}</span>
        <span className="chart-better">{fig.kind === 'lines' ? 'share of question runs · not a score' : fig.measure.better === 'high' ? 'higher is better' : 'lower is better'}</span>
        <span className="chart-slice">{slice}</span>
        <button type="button" className="share-btn" data-share={fig.slug} onClick={copyShare}
          aria-label="Copy a link to this view" title="Copy a link to this view — the protocols, battery, model and columns selected here travel with it">
          {/* the share glyph: a box open at the top with an arrow rising out of it */}
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5.5 6H4.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1" />
            <path d="M8 10V1.5M5.5 4L8 1.5 10.5 4" />
          </svg>
          share
        </button>
        {shareMsg && <span className="share-msg" role="status">{shareMsg}</span>}
      </div>
      {fig.kind === 'lines' && <Lines points={points} panelW={panelW} />}
      {fig.kind === 'columns' && <Columns fig={fig} groups={groups} refs={refs} panelW={panelW} />}
      {fig.kind === 'dots' && <Dots fig={fig} groups={groups} refs={refs} panelW={panelW} />}
      {fig.kind === 'stack' && <Stack fig={fig} groups={armGroups} panelW={panelW} />}
      {fig.kind === 'heatmap' && heatNow && <Heatmap data={heatNow} panelW={panelW} dark={dark} />}
      {pooledBlocked && fig.kind !== 'heatmap' && !byModel && (
        <p className="chart-note">Raw token counts are never pooled across vendors (tokenizers differ), so arms whose selected models span vendors are shown one column per model; ★ marks the best value at each model.</p>
      )}
      {byModel && (
        <p className="chart-note">One group per model, every arm inside it in roster order: Corograph, then each bare harness, then the indexing tools. Columns keep their arm's colour; ★ marks the best arm at that model; the line under each group is Corograph against that ecosystem's bare harness. The values are the per-model columns regrouped, nothing is pooled across models.</p>
      )}
      {showTable && fig.kind === 'lines' && (
        <details className="data" open>
          <summary>Data behind this figure <span className="muted">— {slice}</span></summary>
          <div className="table-actions">
            <button type="button" onClick={() => download(`figure-${fig.number}-${fig.slug}-${sel.exams.join('+')}-${sel.battery}.csv`, 'text/csv', adoptionCsv(points))}>download CSV</button>
            <button type="button" onClick={downloadSVG}>download SVG</button>
          </div>
          <table>
            <thead>
              <tr><th>arm</th><th>role</th><th>model</th><th className="num">share of question runs<br />calling the index</th><th className="num">question runs</th><th className="num">with an index call</th><th className="num">index calls</th><th className="num">setup calls<br />(excluded)</th><th className="num">no tool calls</th><th className="num">conversations</th><th className="num">conversations<br />with an index call</th><th>runs in the repository</th></tr>
            </thead>
            <tbody>
              {(() => {
                const arms = [...new Set(points.map(p => p.arm))]
                return arms.flatMap(arm => {
                  const ps = points.filter(p => p.arm === arm)
                  const info = armInfo(arm)
                  return ps.map((p, i) => (
                    <tr key={arm + p.model} style={{ ['--first' as any]: info.color }}>
                      {i === 0 && <td rowSpan={ps.length}><span className="arm-name"><span className="swatch" style={{ background: info.color }} />{info.short}</span></td>}
                      {i === 0 && <td rowSpan={ps.length} className="muted">{ROLE_LABEL[info.role]}</td>}
                      <td>{modelLabel(p.model)}</td>
                      <td className="num">{p.share != null ? p.share.toFixed(0) + '%' : '—'}</td>
                      <td className="num">{p.questions}</td>
                      <td className="num">{p.withIndex}</td>
                      <td className="num">{p.indexCalls}</td>
                      <td className="num">{p.setupCalls || '—'}</td>
                      <td className="num">{p.withoutTools || '—'}</td>
                      <td className="num">{p.conversations}</td>
                      <td className="num">{p.conversationsWithIndex}</td>
                      <td><a href={runUrl(`runs/${arm}/${p.model}`)} target="_blank" rel="noopener">{modelLabel(p.model)}</a></td>
                    </tr>
                  ))
                })
              })()}
            </tbody>
          </table>
        </details>
      )}
      {showTable && fig.kind !== 'heatmap' && fig.kind !== 'lines' && (
        <details className="data" open>
          <summary>Data behind this figure <span className="muted">— {slice}</span></summary>
          <div className="table-actions">
            <button type="button" onClick={() => download(`figure-${fig.number}-${fig.slug}-${sel.exams.join('+')}-${sel.battery}.csv`, 'text/csv', csvOf(fig, groups))}>download CSV</button>
            <button type="button" onClick={downloadSVG}>download SVG</button>
          </div>
          <table>
            <thead>
              {byModel
                ? <tr><th>model</th><th>arm</th><th>role</th><th className="num measure-th">{(() => { const m = fig.measure.label.match(/^(.*?)\s*(\(.*\))$/); return m ? <>{m[1]}<br />{m[2]}</> : fig.measure.label })()}</th><th className="num">runs</th><th className="num">cells</th><th className="num">min</th><th className="num">max</th><th className="num">sd</th><th>rank<br />(at this model)</th><th>runs in the repository</th></tr>
                : <tr><th>arm</th><th>role</th><th>column</th><th className="num measure-th">{(() => { const m = fig.measure.label.match(/^(.*?)\s*(\(.*\))$/); return m ? <>{m[1]}<br />{m[2]}</> : fig.measure.label })()}</th><th className="num">runs</th><th className="num">cells</th><th className="num">min</th><th className="num">max</th><th className="num">sd</th><th>{groups.some(g => g.columns.length > 1) ? <>rank<br />(at this model)</> : 'rank'}</th><th>runs in the repository</th></tr>}
            </thead>
            <tbody>
              {groups.map(g => g.columns.map((c, i) => {
                const arm = armOfColumn(g, c)
                // first place: the per-model winner on a split row, the top-ranked arm on a pooled row
                const split = g.columns.length > 1 || g.model != null
                const first = split ? c.rank === 1 : g.rank === 1
                // the arm + role cells span the group: they join the tint only when the arm is first at every model
                // (a model group's spanning cell is the model — never tinted)
                const firstAll = g.model != null ? false : split ? g.columns.every(k => k.rank === 1) : first
                const span = split ? { rowSpan: g.columns.length } : {}
                return (
                <tr key={g.key + c.key} className={(first ? 'first' : '') + (firstAll ? ' first-all' : '') || undefined} style={{ ['--first' as any]: arm.color }}>
                  {g.model != null ? (
                    <>
                      {i === 0 && <td {...span}><span className="arm-name">{g.head.title}</span><br /><span className="muted">{g.head.sub}</span>{g.note && <><br /><span className="muted">{g.note}</span></>}</td>}
                      <td><span className="arm-name"><span className="swatch" style={{ background: arm.color }} />{arm.short}</span>{c.best ? ' ★' : ''}</td>
                      <td className="muted">{ROLE_LABEL[arm.role]}</td>
                    </>
                  ) : (
                    <>
                      {i === 0 && <td {...span}><span className="arm-name"><span className="swatch" style={{ background: arm.color }} />{arm.short}</span></td>}
                      {i === 0 && <td {...span} className="muted">{ROLE_LABEL[arm.role]}</td>}
                      <td>{c.label}{c.best ? ' ★' : ''}</td>
                    </>
                  )}
                  <td className="num">{c.value != null ? fmt(fig, c.value) : '—'}</td>
                  <td className="num">{c.n}</td>
                  <td className="num">{c.cells}</td>
                  <td className="num">{c.min != null ? fmt(fig, c.min) : '—'}</td>
                  <td className="num">{c.max != null ? fmt(fig, c.max) : '—'}</td>
                  <td className="num">{c.sd != null ? fmt(fig, c.sd) : '—'}</td>
                  {split
                    ? <td>{c.rank != null ? `${ordinal(c.rank)} of ${c.rankTotal}` : '—'}</td>
                    : <td>{g.rank != null ? `${ordinal(g.rank)} of ${rankTotal}` : '—'}</td>}
                  <td>
                    {c.models.map(m => (
                      <a key={m} href={runUrl(`runs/${arm.id}/${m}`)} target="_blank" rel="noopener">{modelLabel(m)}</a>
                    )).reduce<React.ReactNode[]>((acc, el, j) => (j ? [...acc, ' · ', el] : [el]), [])}
                  </td>
                </tr>
                )
              }))}
            </tbody>
          </table>
        </details>
      )}
      {showTable && fig.kind === 'heatmap' && heatNow && (
        <details className="data" open>
          <summary>Data behind this figure <span className="muted">— {slice}</span></summary>
          <table>
            <thead><tr><th>arm</th><th>column</th><th className="num">pass rate</th><th className="num">attempts</th><th className="num">correct</th><th className="num">models</th></tr></thead>
            <tbody>
              {(() => {
                const cells = heatNow.cells.filter(c => c.rate != null)
                // first place per category column: the highest pass rate among the arms
                const bestByCol = new Map<string, number>()
                for (const c of cells) bestByCol.set(c.col, Math.max(bestByCol.get(c.col) ?? -1, c.rate!))
                return cells.map(c => (
                  <tr key={c.arm + c.col} className={c.rate === bestByCol.get(c.col) ? 'first' : undefined} style={{ ['--first' as any]: armInfo(c.arm).color }}><td>{c.arm}</td><td>{c.col}</td><td className="num">{c.rate!.toFixed(1)}%</td><td className="num">{c.n}</td><td className="num">{c.pass}</td><td className="num">{c.models}</td></tr>
                ))
              })()}
            </tbody>
          </table>
        </details>
      )}
    </div>
  )
}
