// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import { mirroredFiles } from './src/lib/guide'

// The companion site of the public proof package. Static output, deployed by
// GitHub Actions to GitHub Pages. `site` is the canonical origin (the CNAME
// in public/ pins the custom domain); set SITE_BASE when serving under a
// project path instead of a domain root.
const site = process.env.SITE_URL ?? 'https://benchmarks.corograph.com'
const base = (process.env.SITE_BASE ?? '/').replace(/\/$/, '')

export default defineConfig({
  site,
  base: process.env.SITE_BASE ?? '/',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    react(),
    sitemap({
      // The sitemap integration lists pages only; the reader's-guide endpoints
      // and the mirrored repository files are declared explicitly so crawlers
      // (OAI-SearchBot, Googlebot, Bingbot) discover them without a link walk.
      customPages: [
        `${site}${base}/llms.txt`,
        `${site}${base}/llms-full.txt`,
        ...mirroredFiles().map(rel => `${site}${base}/files/${rel}`),
      ],
    }),
  ],
  build: { format: 'directory' },
})
