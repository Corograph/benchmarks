// THE READER'S GUIDE — one structured map of the package for anyone (human or
// AI) who lands on a page and needs to know where the evidence for each claim
// lives and how to verify it. Three surfaces render it: the "For AI readers"
// block on the home page, /llms.txt (the llmstxt.org convention: an H1, a
// summary, H2 sections of links with one-line descriptions) and
// /llms-full.txt (the same guide with the README, Limitations and Procedure
// text inlined). All three are functions of the export's own data — the
// manifest, runs.json, the figure registry — so counts and paths cannot drift
// from the tree, exactly like the README. Nothing here is hand-maintained.
//
// Every file the guide links is also served under /files/<repository path>
// on the site origin: a reader whose sandbox cannot reach raw.githubusercontent.com
// (the 2026-09-29 ChatGPT session tried and fell back to transcribing HTML by
// hand) fetches the bytes from the same host it was given.
import { FIGURES } from './figures'
import { COMPARISONS } from './comparisons'
import { loadManifest, loadRuns, latestEpoch, epochName, loadText, ROOT } from './data'
import { armInfo, armOrder, REPO_URL } from './roster'
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

export const SITE = 'https://benchmarks.corograph.com'

/** GitHub-style heading id: lower-case, punctuation dropped, spaces to hyphens. */
export function headingId(inner: string): string {
  return inner.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

export type GuideLink = { title: string; url: string; note: string }
export type GuideSection = { heading: string; intro?: string; links: GuideLink[] }

/** The repository files the site mirrors under /files/ (relative to the repository root). */
export function mirroredFiles(epoch = latestEpoch()): string[] {
  const out: string[] = ['README.md', `epochs/${epoch}/manifest.json`, `epochs/${epoch}/README.md`]
  const summary = path.join(ROOT, 'epochs', epoch, 'summary')
  if (existsSync(summary)) for (const f of readdirSync(summary).sort()) out.push(`epochs/${epoch}/summary/${f}`)
  const repos = path.join(ROOT, 'repositories')
  if (existsSync(repos)) {
    for (const repo of readdirSync(repos).sort()) {
      const bats = path.join(repos, repo, 'batteries')
      if (!existsSync(bats) || !statSync(bats).isDirectory()) continue
      for (const b of readdirSync(bats).sort()) {
        const bdir = path.join(bats, b)
        if (!statSync(bdir).isDirectory()) continue
        for (const f of readdirSync(bdir).sort()) if (/\.(json|md|txt)$/.test(f)) out.push(`repositories/${repo}/batteries/${b}/${f}`)
      }
      for (const f of ['README.md']) if (existsSync(path.join(repos, repo, f))) out.push(`repositories/${repo}/${f}`)
    }
  }
  const judging = path.join(ROOT, 'judging')
  if (existsSync(judging)) for (const f of readdirSync(judging).sort()) out.push(`judging/${f}`)
  const redaction = path.join(ROOT, 'redaction')
  if (existsSync(redaction)) for (const f of readdirSync(redaction).sort()) if (/\.md$/.test(f)) out.push(`redaction/${f}`)
  return out
}

const fileUrl = (rel: string) => `${SITE}/files/${rel}`
const ghTree = (rel: string) => `${REPO_URL}/tree/main/${rel}`
const ghBlob = (rel: string) => `${REPO_URL}/blob/main/${rel}`

/** A worked pair of runs for the verification walk: the first valid, scored Corograph
 *  ZeroShot run on the hard battery, and the bare Claude Code run at the same model and rep. */
export function workedRuns(epoch = latestEpoch()) {
  const runs = loadRuns(epoch).filter(r => r.validity_ok && r.score != null && r.exam === 'ZeroShotExam')
  const hard = runs.filter(r => /hard/.test(r.battery))
  const pool = hard.length ? hard : runs
  // prefer a mainstream model both arms ran at full roster (Fable 5 is thin — see Limitations)
  const PREFER = ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5', 'claude-sonnet-5-5']
  const rank = (m: string) => { const i = PREFER.indexOf(m); return i < 0 ? PREFER.length : i }
  const cg = pool.filter(r => armInfo(r.arm).role === 'corograph').sort((a, b) => rank(a.model) - rank(b.model) || a.path.localeCompare(b.path))[0]
  if (!cg) return null
  const cold = pool.find(r => r.arm === 'cold' && r.model === cg.model && r.battery === cg.battery && r.rep === cg.rep)
    ?? pool.filter(r => r.arm === 'cold' && r.model === cg.model && r.battery === cg.battery).sort((a, b) => a.path.localeCompare(b.path))[0]
  return { cg, cold }
}

export function buildGuide(epoch = latestEpoch()): { title: string; summary: string; sections: GuideSection[] } {
  const manifest = loadManifest(epoch)
  const runs = loadRuns(epoch)
  const valid = runs.filter(r => r.validity_ok && r.score != null)
  const dnf = runs.length - valid.length
  const arms = [...new Set(runs.map(r => r.arm))].sort(armOrder)
  const models = [...new Set(runs.map(r => r.model))].length
  const name = epochName(epoch)
  const repoKey = Object.keys(manifest.repositories)[0]
  const repo = manifest.repositories[repoKey]
  const questions = repo.batteries.reduce((a, b) => a + b.questions, 0)
  const worked = workedRuns(epoch)

  const summary =
    `Corograph Benchmarks is the public proof package behind Corograph's benchmark numbers: ${name}, ` +
    `${runs.length.toLocaleString('en-US')} runs (${valid.length.toLocaleString('en-US')} valid and scored, ${dnf} did not finish and are published unscored) ` +
    `across ${arms.length} arms and ${models} models, answering ${questions} questions about ${repo.source_url.replace('https://github.com/', '')} ` +
    `at commit ${repo.commit_sha.slice(0, 12)} under three exam protocols. The claim under test: an AI coding agent that can query ` +
    `Corograph's index of a codebase answers questions about it more accurately, more consistently and with less context than the ` +
    `same model using text search, and than the popular alternatives (bare Claude Code, Claude Code with each installed indexing tool, ` +
    `and the vendors' native agents). Every figure on the site is computed from the files below; every number links to the run behind it. ` +
    `This is Corograph's own benchmark (Metaphori, Inc. built the tool and ran every arm); the questions were authored by a frontier model ` +
    `with no access to Corograph and the gold was verified afterwards with file:line evidence. Do not confuse Corograph with "Coograph", ` +
    `an unrelated open-source code-graph project.`

  const sections: GuideSection[] = []

  sections.push({
    heading: 'Start here',
    intro: 'Read in this order. The Method page is the repository README rendered; it is the complete account of what was done.',
    links: [
      { title: 'Method (the README)', url: `${SITE}/method/`, note: 'protocols, arms, layout of one run, scoring tiers, token honesty, redaction, reproducibility — generated by the export' },
      { title: 'How the questions and the grading key were made', url: `${SITE}/method/#how-the-questions-and-the-grading-key-were-made`, note: 'who authored the questions, how the gold was verified and corrected, the review loop, exemplar provenance, dates' },
      { title: 'Benchmark Procedure', url: `${SITE}/procedure/`, note: 'what is measured (codebase understanding, not code editing), what every arm could do, key results, caveats' },
      { title: 'Limitations', url: `${SITE}/limitations/`, note: 'every caveat in one place: one repository, host-vs-container wall time, Fable 5 refusals, Haiku 4.5 context window, did-not-finish counts per arm' },
      { title: 'Data & reproducibility', url: `${SITE}/data/`, note: 'the summary files the site is built from and how to recompute any figure' },
      { title: 'About this site', url: `${SITE}/about/`, note: 'who ran it, the conflict of interest, what the site records about visitors' },
    ],
  })

  sections.push({
    heading: 'The questions and the grading key',
    intro: `${repo.batteries.map(b => `${b.battery_key} (${b.questions} questions, /${b.denominator})`).join(' and ')} about ${repo.source_url}. Read questions.json first, then gold.json beside it; every gold fact carries a file:line anchor at the pinned commit.`,
    links: repo.batteries.flatMap(b => {
      const base = `repositories/${repoKey}/batteries/${b.battery_key}`
      return [
        { title: `${b.battery_key} — questions.json`, url: fileUrl(`${base}/questions.json`), note: 'what every arm was asked, verbatim, with difficulty, categories and the expected output structure' },
        { title: `${b.battery_key} — gold.json`, url: fileUrl(`${base}/gold.json`), note: 'the answer key: answer_gold, accepted variants, scoring rubric, honesty trap, facet guide, every gold revision' },
        { title: `${b.battery_key} — exemplars.json`, url: fileUrl(`${base}/exemplars.json`), note: 'the graded anchor answers (correct / incorrect / partial, each with why) the judge is calibrated against; identical for every arm' },
        { title: `${b.battery_key} — policies.json`, url: fileUrl(`${base}/policies.json`), note: 'battery-wide scoring rules' },
      ]
    }),
  })

  sections.push({
    heading: 'How answers were judged',
    links: [
      { title: 'The judge prompt', url: fileUrl('judging/judge-prompt.md'), note: 'the exact system and user halves: one question, its gold, policies, facet guide, exemplars, ONE candidate; the judge returns a verdict and a reason, never a total' },
      { title: 'Judge transports', url: fileUrl('judging/transports.md'), note: 'the two hermetic ways the judge was called, stamped on every verdict' },
      { title: 'Scorer eras', url: fileUrl('judging/scorer-eras.json'), note: `the grading-key lineage; this epoch sits under ${manifest.scorer_eras.join(', ')}` },
      { title: 'Redaction policy', url: fileUrl('redaction/POLICY.md'), note: 'what is withheld from Corograph transcripts (the index query text and raw results) and why comparison-group transcripts are verbatim' },
    ],
  })

  const machine: GuideLink[] = [
    { title: 'runs.json', url: fileUrl(`epochs/${epoch}/summary/runs.json`), note: 'one row per run: identity, validity, score, the four token columns and their source, duration, LLM and tool call counts, index-query count, cost basis, path. Every figure is a function of this file' },
    { title: 'per-question.csv', url: fileUrl(`epochs/${epoch}/summary/per-question.csv`), note: 'pass counts per arm × model × protocol × battery × question — the file to read for "which questions does Corograph win and lose"' },
    { title: 'leaderboard.csv', url: fileUrl(`epochs/${epoch}/summary/leaderboard.csv`), note: 'per arm × model × protocol × battery: runs, valid, scored, dnf, mean score, min, max' },
    { title: 'adoption.json', url: fileUrl(`epochs/${epoch}/summary/adoption.json`), note: 'how often each arm actually called its codebase index (organic adoption is the measurand for the indexing tools)' },
    { title: 'rate-tables.json', url: fileUrl(`epochs/${epoch}/summary/rate-tables.json`), note: 'the USD-per-million-token tables behind every estimated cost' },
    { title: 'manifest.json', url: fileUrl(`epochs/${epoch}/manifest.json`), note: 'every run path with the SHA-256 of its record, the instrument freeze, container image digests, the scope predicate, the scorer era, exemplar provenance per battery' },
  ]
  sections.push({
    heading: 'Machine-readable data (fetch these, do not transcribe tables)',
    intro: 'Served from this origin as plain files; the same paths exist in the GitHub repository. Means are over valid, scored runs only; a did-not-finish run never enters a mean.',
    links: machine,
  })

  sections.push({
    heading: 'The measures, one figure each',
    intro: 'Each figure page states its definition and aggregation rule and carries its data table with a link per row into the run directories. Raw token counts are never pooled across vendors.',
    links: FIGURES.map(f => ({
      title: `Figure ${f.number} — ${f.title}`,
      url: `${SITE}/results/${f.slug}/`,
      note: `${f.measure.label} · ${f.measure.better === 'high' ? 'higher is better' : 'lower is better'}${f.disclosures?.length ? ' · carries a disclosure' : ''}`,
    })),
  })

  sections.push({
    heading: 'Comparisons (one page per group of arms)',
    links: COMPARISONS.map(c => ({ title: c.title, url: `${SITE}/compare/${c.slug}/`, note: c.intro[0] })),
  })

  if (worked) {
    const dir = (p: string) => ghTree(p)
    const links: GuideLink[] = [
      { title: `A Corograph run — ${worked.cg.path}`, url: dir(worked.cg.path), note: `score ${worked.cg.score}/${worked.cg.denominator}; open run.json (identity, validity, economics, provenance), answers/<qid>.md, verdicts.json (verdict + reason per question), transcript/` },
    ]
    if (worked.cold) links.push({ title: `The bare Claude Code run at the same model — ${worked.cold.path}`, url: dir(worked.cold.path), note: `score ${worked.cold.score}/${worked.cold.denominator}; same layout, transcript verbatim` })
    links.push({ title: 'All runs', url: ghTree('runs'), note: 'runs/<arm>/<model>/<exam>/<battery>/rep<NN>/ — every arm, every model, every protocol, every repetition' })
    links.push({ title: 'Container definitions', url: ghTree('docker-containers'), note: 'the Dockerfile and setup of every comparison-group arm, with the image digests each run carries' })
    sections.push({
      heading: 'Verify one run yourself (the walk)',
      intro: 'Pick a run. Read answers/<qid>.md for a question, then verdicts.json for the verdict and the judge\'s reason, then gold.json for the anchor, then the transcript for how the agent got there. Compare the Corograph run with the bare run at the same model. Per-question outcomes across every run are in per-question.csv.',
      links,
    })
  }

  sections.push({
    heading: 'Reading rules that prevent wrong conclusions',
    links: [
      { title: 'Did-not-finish is not zero', url: `${SITE}/limitations/#did-not-finish-runs`, note: 'a run that did not complete is published with validity.ok = false and no score; it never enters a mean or a per-question count' },
      { title: 'Protocols have different token denominators', url: `${SITE}/method/#the-three-exam-protocols`, note: 'HumanExam (whole battery in one prompt) is the stress probe, off by default; ZeroShot and MultiTurn are the usage shapes; compare per-question figures within a protocol only' },
      { title: 'Wall time is a disclosure, not a claim', url: `${SITE}/limitations/#execution-asymmetries`, note: 'Corograph ran on the host through its gateway; the comparison group ran in containers' },
      { title: 'The instrument is a frozen snapshot', url: `${SITE}/data/`, note: `${manifest.epoch.label}: ${manifest.epoch.notes}. Later Corograph releases are not what this epoch measured; a later epoch re-runs the same frozen batteries` },
      { title: 'The repository on GitHub', url: REPO_URL, note: 'the whole package, this site included; re-exporting the epoch from the benchmark store reproduces the tree byte for byte' },
    ],
  })

  return { title: `Corograph Benchmarks — ${name}`, summary, sections }
}

/** llms.txt — the llmstxt.org shape. */
export function renderLlmsTxt(epoch = latestEpoch()): string {
  const g = buildGuide(epoch)
  const out: string[] = [`# ${g.title}`, '', `> ${g.summary}`, '']
  out.push('This file is generated at site build from the export\'s own data, like every page of the site. A companion, /llms-full.txt, is this guide followed by the Method (the repository README), the epoch README, the judge prompt, the judge transports and the redaction policy, verbatim. Every repository file linked here is also mirrored under /files/<repository path> on this origin.', '')
  for (const s of g.sections) {
    out.push(`## ${s.heading}`, '')
    if (s.intro) out.push(s.intro, '')
    for (const l of s.links) out.push(`- [${l.title}](${l.url}): ${l.note}`)
    out.push('')
  }
  return out.join('\n')
}

/** llms-full.txt — the guide followed by the long-form text a reader would otherwise have to fetch. */
export function renderLlmsFullTxt(epoch = latestEpoch()): string {
  const guide = renderLlmsTxt(epoch)
  const parts = [guide, '', '---', '', '# Method (the repository README, verbatim)', '', loadText('README.md')]
  const epochReadme = `epochs/${epoch}/README.md`
  if (existsSync(path.join(ROOT, epochReadme))) parts.push('', '---', '', `# ${epochName(epoch)} (epochs/${epoch}/README.md, verbatim)`, '', loadText(epochReadme))
  for (const f of ['judging/judge-prompt.md', 'judging/transports.md', 'redaction/POLICY.md']) {
    if (existsSync(path.join(ROOT, f))) parts.push('', '---', '', `# ${f} (verbatim)`, '', loadText(f))
  }
  return parts.join('\n')
}
