// The site's data contract — one row per run, exactly the fields the export
// writes to epochs/E00N/summary/runs.json (flattened from each run.json).
export type RunRow = {
  path: string
  run_key: string
  arm: string
  arm_label: string
  side: 'corograph' | 'comparison'
  family: string
  model: string
  exam: 'HumanExam' | 'ZeroShotExam' | 'MultiTurnExam'
  battery: string
  denominator: number
  rep: number
  exam_epoch: number | null
  validity_ok: boolean
  validity_reason: string
  score: number | null
  fails: number | null
  adjudicated: number
  scorer_era: string | null
  tokens_input: number
  tokens_output: number
  tokens_cache_read: number
  tokens_cache_write: number
  token_source: string
  cost_reported_usd: number | null
  cost_usd: number | null            // vendor-reported, else the bench's rate-table estimate, else null
  cost_basis: string                 // 'vendor_reported' | 'estimated:<rate table version>' | 'unknown'
  duration_ms: number | null
  llm_calls: number | null
  tool_calls: number
  tool_calls_by_class: Record<string, number>
  tool_time_ms: number | null
  tool_result_tokens: number | null  // Σ token-estimated tool result payload
  query_calls: number
}

export type Question = {
  qid: string
  position: number
  prompt: string
  output_structure: string
  difficulty: number
  categories: string[]
}

export type PerQuestion = {
  arm: string; model: string; exam: string; battery: string; qid: string
  pass: number; n: number; pass_rate: number
}

// epochs/E00N/summary/adoption.json — how often each harness consulted its
// codebase index, at question grain (Figure 16).
export type AdoptionRow = {
  arm: string; model: string; exam: string; battery: string
  questions: number; questions_with_index: number; questions_without_tools: number
  index_calls: number; setup_calls: number
  conversations: number; conversations_with_index: number
}
export type AdoptionArm = { arm: string; index_kind: 'corograph' | 'mcp' | 'skill' | 'none'; index_tools: Record<string, number>; setup_tools_excluded: Record<string, number> }
export type AdoptionDoc = { definition: Record<string, string>; arms: AdoptionArm[]; rows: AdoptionRow[] }

export type Manifest = {
  epoch: { id: string; no: number; label: string; notes: string }
  export_tool: { name: string; version: string; schema: string }
  scorer_eras: string[]
  docker_images: Record<string, string[]>
  freezes: Record<string, unknown>
  repositories: Record<string, { source_url: string; commit_sha: string; batteries: { battery_key: string; questions: number; denominator: number; title: string }[] }>
  runs: { path: string; arm: string; model: string; exam: string; battery: string; rep: number; side: string; validity_ok: boolean }[]
  scope: { corograph_predicate: string; comparison_predicate: string; run_selection?: string; runs: number }
}
