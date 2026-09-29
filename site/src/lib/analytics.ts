// Analytics + early-access handoff — the one place the site names them.
//
// Counter: self-hosted Umami at insight.corograph.com (cookieless, no IP stored;
// the script and beacon are named generically so list-based blockers do not match).
// Emitted ONLY when the build runs with SITE_ENV=production (the Pages deploy job);
// local builds and any preview emit nothing. The website id is not a secret — it is
// visible in every page that carries the snippet — so it lives here, not in CI.
//
// Handoff: every early-access CTA on this site links OUT to corograph.com, which
// owns the form and the list. The site never collects anything itself.
// Heatmaps: the same server's recorder captures click positions and scroll depth for a
// sample of visits (aggregated only; replay is OFF on the dashboard, nothing is played back).
export const ANALYTICS = {
  enabled: process.env.SITE_ENV === 'production',
  scriptUrl: 'https://insight.corograph.com/bench.js',
  recorderUrl: 'https://insight.corograph.com/recorder.js',
  websiteId: 'da631299-80f9-4b80-a400-5f328ac26514',
}

// www is the primary host (the bare domain 301s to it) — link there directly, no hop
export const EARLY_ACCESS_URL = 'https://www.corograph.com/early-access'
// referrer tags the founder sends out (?ref=…); anything else is recorded as-is, lowercase
export const KNOWN_REFS = ['ev', 'hn', 'x', 'li', 'email', 'deck', 'gh', 'reddit', 'blog', 'direct'] as const
