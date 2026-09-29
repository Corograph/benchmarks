// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

// The companion site of the public proof package. Static output, deployed by
// GitHub Actions to GitHub Pages. `site` is the canonical origin (the CNAME
// in public/ pins the custom domain); set SITE_BASE when serving under a
// project path instead of a domain root.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://benchmarks.corograph.com',
  base: process.env.SITE_BASE ?? '/',
  output: 'static',
  trailingSlash: 'always',
  integrations: [react(), sitemap()],
  build: { format: 'directory' },
})
