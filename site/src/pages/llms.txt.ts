// /llms.txt — the reader's guide in the llmstxt.org shape (see lib/guide.ts).
import type { APIRoute } from 'astro'
import { renderLlmsTxt } from '../lib/guide'

export const GET: APIRoute = () =>
  new Response(renderLlmsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
