// /files/<repository path> — the summary files, the grading key, the judging
// documents and the README, served byte-for-byte from this origin so a reader
// (or a sandboxed agent) can fetch them without reaching GitHub. The list is
// enumerated at build time from the repository tree (lib/guide.ts
// mirroredFiles); run directories are NOT mirrored (4 GB) — they stay on GitHub.
import type { APIRoute, GetStaticPaths } from 'astro'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ROOT } from '../../lib/data'
import { mirroredFiles } from '../../lib/guide'

const TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

export const getStaticPaths: GetStaticPaths = () => mirroredFiles().map(rel => ({ params: { path: rel } }))

export const GET: APIRoute = ({ params }) => {
  const rel = params.path!
  const data = readFileSync(path.join(ROOT, rel))
  return new Response(data, { headers: { 'Content-Type': TYPES[path.extname(rel)] ?? 'application/octet-stream' } })
}
