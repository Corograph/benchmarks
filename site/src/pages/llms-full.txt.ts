// /llms-full.txt — the guide plus the Method (README), the epoch README, the
// judge prompt, the transports and the redaction policy, inlined (lib/guide.ts).
import type { APIRoute } from 'astro'
import { renderLlmsFullTxt } from '../lib/guide'

export const GET: APIRoute = () =>
  new Response(renderLlmsFullTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
