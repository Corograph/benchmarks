// Build-time loaders: the site reads the public proof package it lives inside
// (../epochs/E00N/summary/runs.json, the manifest, the grading key) and nothing
// else. Every number on the site is a function of those files.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import type { RunRow, Manifest, Question, PerQuestion, AdoptionDoc } from './types'

// The repository root = the nearest ancestor of the working directory that
// holds epochs/ (the build runs with cwd = site/, locally and in Actions;
// import.meta.url points into dist/ after bundling, so it cannot be used).
function findRoot(): string {
  let dir = process.cwd()
  for (let i = 0; i < 5; i++) {
    if (existsSync(path.join(dir, 'epochs')) && existsSync(path.join(dir, 'README.md'))) return dir
    dir = path.dirname(dir)
  }
  throw new Error('repository root (a directory holding epochs/ and README.md) not found above ' + process.cwd())
}
export const ROOT = findRoot()

export function latestEpoch(): string {
  const dirs = readdirSync(path.join(ROOT, 'epochs')).filter(d => /^E\d{3}$/.test(d)).sort()
  if (!dirs.length) throw new Error('no epochs/E00N directory found')
  return dirs[dirs.length - 1]
}

/** The epoch's display name: "E004" (the folder + manifest id) reads as "Epoch-4" everywhere on the site. */
export const epochName = (id: string) => `Epoch-${parseInt(id.replace(/\D/g, ''), 10)}`

export function loadManifest(epoch = latestEpoch()): Manifest {
  return JSON.parse(readFileSync(path.join(ROOT, 'epochs', epoch, 'manifest.json'), 'utf8'))
}

export function loadRuns(epoch = latestEpoch()): RunRow[] {
  const p = path.join(ROOT, 'epochs', epoch, 'summary', 'runs.json')
  if (!existsSync(p)) throw new Error(`${p} missing — re-run the export (it writes runs.json beside leaderboard.csv)`)
  return JSON.parse(readFileSync(p, 'utf8'))
}

export function loadPerQuestion(epoch = latestEpoch()): PerQuestion[] {
  const text = readFileSync(path.join(ROOT, 'epochs', epoch, 'summary', 'per-question.csv'), 'utf8')
  const [head, ...lines] = text.trim().split('\n')
  const cols = head.split(',')
  return lines.map(l => {
    const f = l.split(',')
    const o: Record<string, string> = {}
    cols.forEach((c, i) => (o[c] = f[i]))
    return { arm: o.arm, model: o.model, exam: o.exam, battery: o.battery, qid: o.qid, pass: +o.pass, n: +o.n, pass_rate: +o.pass_rate }
  })
}

export function loadAdoption(epoch = latestEpoch()): AdoptionDoc {
  const p = path.join(ROOT, 'epochs', epoch, 'summary', 'adoption.json')
  if (!existsSync(p)) throw new Error(`${p} missing — re-run the export (it writes adoption.json beside runs.json)`)
  return JSON.parse(readFileSync(p, 'utf8'))
}

export function loadQuestions(repoPublic: string, battery: string): Question[] {
  return JSON.parse(readFileSync(path.join(ROOT, 'repositories', repoPublic, 'batteries', battery, 'questions.json'), 'utf8'))
}

export function loadReadme(): string {
  return readFileSync(path.join(ROOT, 'README.md'), 'utf8')
}

export function loadText(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8')
}

/** The compact row a figure island receives — only what it plots. */
export type FigRow = {
  arm: string; model: string; exam: string; battery: string; rep: number; path: string
  denominator: number; score: number | null; fails: number | null; ok: boolean
  v: number | null
}
