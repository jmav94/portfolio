# juanahumada.com — personal portfolio

Static, bilingual (ES/EN) portfolio built with **Astro 6**. Hosted on Vercel, custom domain `juanahumada.com`.

## Stack

- **Astro 6** (static output, content collections + glob loader)
- **i18n routing** (`/en/...`, `/es/...`) with hreflang + sitemap localized
- **MDX-ready** (only plain MD used so far)
- **RSS** feed at `/writing/rss.xml`
- **Dark mode** via `prefers-color-scheme` + `localStorage` persistence
- **Typography**: Manrope (display) + IBM Plex Sans (body) + IBM Plex Mono (numbers/keys)
- **Zero JS frameworks** — pure Astro components

## Project layout

```
src/
├── components/         Nav, Footer, Hero, StackBlock, FeaturedGrid
├── layouts/            BaseLayout, CaseStudyLayout, PostLayout
├── pages/
│   ├── index.astro     Root → 302 redirect to /en
│   ├── en/             English routes (mirror of /es)
│   ├── es/             Spanish routes
│   └── writing/rss.xml.ts
├── content/
│   ├── case-studies/
│   │   ├── en/         English case studies (.md)
│   │   └── es/         Spanish case studies (.md)
│   └── writing/
│       ├── en/         English posts (.md)
│       └── es/         Spanish posts (.md)
├── content.config.ts   Content collection schemas
├── i18n/
│   ├── ui.ts           Translation strings
│   └── utils.ts        i18n helpers (path resolution, alt-lang)
└── styles/global.css   Design system (CSS variables, typography, components)
public/
├── photo.png           Profile photo
├── cv/cv-en.pdf        Résumé download (EN)
├── cv/cv-es.pdf        Résumé download (ES)
└── favicon.svg
```

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output to ./dist
npm run preview    # serve the built site
```

## Adding content

### A new case study

1. Create `src/content/case-studies/en/<slug>.md` and `src/content/case-studies/es/<slug>.md`
2. Use the existing frontmatter schema:

```yaml
---
title: "..."
summary: "..."
role: "..."
industry: "..."
year: "2026"
stack: ["AWS", "..."]
metrics:
  - { label: "...", value: "..." }
featured: false
order: 4
---
```

3. Add it to the home page's `cases` array in `src/pages/{en,es}/index.astro` if you want it featured.

### A new blog post

1. Create `src/content/writing/en/<slug>.md` and `src/content/writing/es/<slug>.md`
2. Frontmatter:

```yaml
---
title: "..."
summary: "..."
publishedAt: "2026-MM-DD"
tags: ["aws", "..."]
minRead: 5
draft: false
---
```

The post auto-appears in `/writing` and in the RSS feed.

### Updating the résumé PDFs

The portfolio links to PDFs at `public/cv/cv-en.pdf` and `public/cv/cv-es.pdf`. To refresh, regenerate from `/Users/juanahumada/dev/cv-update/` and copy into `public/cv/`.

## Deploy to Vercel

### One-time setup

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Vercel auto-detects Astro. Defaults are correct (`npm run build`, output dir `dist`).
4. Deploy.

### Custom domain: juanahumada.com

In Vercel project settings → **Domains**:

1. Add `juanahumada.com` and `www.juanahumada.com`.
2. Vercel shows the DNS records you need to add at your registrar:
   - For the apex (`juanahumada.com`):
     - `A` record → `76.76.21.21` (Vercel)
     - or `ALIAS`/`ANAME` → `cname.vercel-dns.com` (if your registrar supports it)
   - For `www`:
     - `CNAME` → `cname.vercel-dns.com`
3. Apply the DNS changes at your registrar (Namecheap, Cloudflare, etc.).
4. Vercel automatically provisions an SSL certificate via Let's Encrypt — usually live within 1–5 minutes once DNS propagates.

### Recommended production settings in Vercel

- **Production branch**: `main`
- **Preview deployments**: enabled (every PR gets a preview URL)
- **Auto-deploy on push**: enabled
- **Environment variables**: none required for this site
- **Edge caching**: enabled by default; static output benefits from it automatically

### Verify after deploy

Smoke-test these URLs (replace with your domain):

- `https://juanahumada.com` → 302 redirect to `/en`
- `https://juanahumada.com/en` → home (English)
- `https://juanahumada.com/es` → home (Spanish)
- `https://juanahumada.com/en/case-studies` → case studies index
- `https://juanahumada.com/en/writing/4m-row-deadlock-lessons` → individual post
- `https://juanahumada.com/writing/rss.xml` → RSS feed
- `https://juanahumada.com/sitemap-index.xml` → sitemap (created by `@astrojs/sitemap`)
- `https://juanahumada.com/cv/cv-en.pdf` → résumé download

### Continuous deploy from local

```bash
git add .
git commit -m "..."
git push origin main
# Vercel auto-builds and deploys in ~30s.
```

## Maintenance checklist (quarterly)

- [ ] Refresh `cv-en.pdf` and `cv-es.pdf` if your résumé changed
- [ ] Update `Year — Present` dates if a role ended
- [ ] Publish at least one new writing post per quarter (keeps the site "alive" for recruiters)
- [ ] Audit Lighthouse scores (Performance, Accessibility, SEO) via Vercel Analytics or `npx lighthouse https://juanahumada.com`

## License

Content (writing, case studies, bio) © Juan Manuel Ahumada Vázquez. Code is unlicensed reference — copy if you find it useful.
