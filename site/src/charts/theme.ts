// Chart chrome reads from CSS custom properties so the light/dark toggle is
// pure CSS; only DATA colors (the arm identities) are literal.
export const T = {
  ink: 'var(--ink)',
  muted: 'var(--muted)',
  faint: 'var(--faint)',
  grid: 'var(--grid)',
  baseline: 'var(--baseline)',
  surface: 'var(--surface)',
  accent: 'var(--accent)',
  incorrect: 'var(--stack-incorrect)',
  dnf: 'var(--stack-dnf)',
}

export const FONT_SERIF = '"Source Serif 4", Georgia, "Times New Roman", serif'
export const FONT_SANS = 'Inter, system-ui, -apple-system, sans-serif'
export const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
