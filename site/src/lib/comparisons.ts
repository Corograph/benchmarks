// One-click comparisons: a fixed set of arms and models with the key figures
// stacked; the site-wide columns choice (pooled first, per model for like-for-
// like reads at a fixed model) applies. Every figure on a comparison page is the same island
// as its full figure page, restricted to the comparison's arms and models.
import { vendorOf, armInfo } from './roster'

export type Comparison = {
  slug: string
  title: string
  short: string
  intro: string[]
  arms: (id: string) => boolean
  models: (m: string) => boolean
  figures: string[]
  note?: string
}

// The seven figures every comparison page shows, in order: the six owner-
// ordered figures, then the category grid restricted to the page's arms and
// models (which is what makes its pooled cells like for like).
export const COMPARISON_FIGURES = ['context-tokens', 'cost-per-correct', 'outcomes', 'accuracy', 'cost-variance', 'tool-result-tokens', 'categories']

export const COMPARISONS: Comparison[] = [
  {
    slug: 'anthropic', title: 'Corograph & Anthropic', short: 'Corograph & Anthropic',
    intro: [
      'Every arm that ran at an Anthropic model — bare Claude Code, Cursor Agent at Claude models, and the five indexing tools installed on Claude Code — beside Corograph at the same models.',
      'Switch the columns to per model and each comparison is like for like: Haiku against Haiku, Sonnet against Sonnet, Opus against Opus.',
    ],
    arms: () => true,
    models: m => vendorOf(m) === 'anthropic',
    figures: COMPARISON_FIGURES,
  },
  {
    slug: 'openai', title: 'Corograph & OpenAI', short: 'Corograph & OpenAI',
    intro: [
      'Corograph at GPT 5.6 Luna, Terra and Sol beside the two harnesses that run those models natively: OpenAI\'s own Codex CLI, and Cursor Agent at the same GPT models.',
      'This is the vendor-native comparison: a bare harness built around a model family, against the same family given Corograph\'s codebase index.',
    ],
    arms: id => ['cg-ask', 'codex', 'cursor'].some(p => id.startsWith(p)),
    models: m => vendorOf(m) === 'openai',
    figures: COMPARISON_FIGURES,
  },
  {
    slug: 'indexers', title: 'Corograph vs Indexers', short: 'Corograph vs Indexers',
    intro: [
      'The five tools people install on Claude Code to give it a code graph — Graphify, GitNexus, CodeGraph, CodebaseMemory and Serena — each installed as shipped, beside Corograph and bare Claude Code as the baseline they were installed on.',
      'The indexing tools ran at Anthropic models only, so this comparison is restricted to those models; switch the columns to per model for one column per model for every arm.',
    ],
    arms: id => armInfo(id).role !== 'bare' || id === 'cold',
    models: m => vendorOf(m) === 'anthropic',
    // + Figure 16: how often each harness reached for the index it was given
    figures: [...COMPARISON_FIGURES, 'index-adoption'],
  },
  {
    slug: 'harnesses', title: 'Corograph vs Harnesses', short: 'Corograph vs Harnesses',
    intro: [
      'The null hypotheses of each ecosystem — Claude Code with nothing added, OpenAI\'s Codex CLI, and Cursor Agent through its SDK — beside Corograph across every model any of them ran.',
      'Every column is one model, so each read is harness against harness at a fixed model: the model is held constant and only the tooling around it changes.',
    ],
    arms: id => armInfo(id).role !== 'indexer',
    models: () => true,
    figures: COMPARISON_FIGURES,
  },
]

export const comparisonBySlug = (slug: string) => COMPARISONS.find(c => c.slug === slug)
