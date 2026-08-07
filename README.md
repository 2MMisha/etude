# ETUDE Dance School — Website

A trilingual (Hebrew / English / Russian) marketing and content site for ETUDE Dance School in Rishon LeZion, built with [Astro](https://astro.build) and hosted free on GitHub Pages.

- **Live site:** https://etude.ristar.co
- **Default language:** Hebrew (`/he/`) — used for canonical URLs and `x-default` hreflang
- **Also available in:** English (`/en/`), Russian (`/ru/`)

---

## 1. Local development

Requirements: Node.js 22+.

```bash
npm install
npm run dev       # starts a local dev server, usually at http://localhost:4321
npm run build      # builds the static site into ./dist
npm run preview    # serves the built ./dist locally, to sanity-check a production build
```

When checking the build locally, open all three language versions (`/he/`, `/en/`, `/ru/`) and confirm the Hebrew pages render right-to-left correctly.

---

## 2. Deploying (GitHub Pages)

Deployment is fully automated. Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages — no manual steps, no paid hosting.

### One-time setup (already done, documented for reference)

1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions** (not "Deploy from a branch").
3. The custom domain `etude.ristar.co` is set via the `public/CNAME` file, which GitHub Pages reads automatically. Under **Settings → Pages → Custom domain**, it should show `etude.ristar.co` with "DNS check successful" once DNS is configured (see below) — also tick **Enforce HTTPS** once the certificate is issued.

### DNS setup

At your DNS provider for `ristar.co`, add a `CNAME` record:

| Type  | Host / Name | Value                          |
|-------|-------------|---------------------------------|
| CNAME | `etude`     | `<your-github-org>.github.io`   |

(If your DNS provider doesn't support `CNAME` at a subdomain the way you need, use an `ALIAS`/`ANAME` record instead, pointed the same way.)

DNS propagation can take anywhere from a few minutes to a few hours. GitHub Pages will show "DNS check successful" on the Pages settings page once it's live.

> **Note on the GitHub org:** these instructions assume the repository lives under a GitHub org/account whose handle is close to `ristar.co` (e.g. `ristar-co`, since GitHub handles can't contain dots). If your actual org handle differs, swap it into the `<your-github-org>.github.io` value above and into `src/lib/site.ts` (`githubOrg` field) — that field is documentation-only and doesn't affect the build.

---

## 3. Editing content without touching code

Two kinds of content are editable by non-technical staff directly from GitHub's website, with no code and no local setup:

- **News posts** — announcements, updates
- **Schedule slots** — weekly class times

Both work the same way: a form in the **Actions** tab writes a small file to the repo and the site rebuilds automatically within a couple of minutes.

### Adding or updating a News post

1. Go to the repo on GitHub → **Actions** tab.
2. In the left sidebar, click **News: Add or Update Post**.
3. Click **Run workflow** (top right).
4. Fill in the form:
   - **Post ID** — a short id used in the web address, lowercase with hyphens only (e.g. `autumn-open-house`). Using the same ID as an existing post **overwrites** that post — this is how you edit one.
   - **Date** — format `YYYY-MM-DD`, e.g. `2026-09-15`.
   - **Image URL** — optional. Leave blank to show a placeholder. See "Adding an image" below for how to get a URL.
   - **Title** and **Body**, each in Hebrew, English, and Russian.
     - Body fields are single-line — GitHub's form doesn't support multi-line text boxes. Write the body as one continuous paragraph (no line breaks). This is a GitHub limitation, not a bug.
5. Click the green **Run workflow** button to submit.
6. Wait about 1–2 minutes, then check the **Actions** tab — a green checkmark means it worked and the site is rebuilding. A red X means something was invalid (e.g. a bad ID or date format); click into the failed run to see the error message, which explains exactly what to fix.

### Deleting a News post

**Actions** tab → **News: Delete Post** → **Run workflow** → enter the exact Post ID → **Run workflow**.

### Adding or updating a Schedule slot

**Actions** tab → **Schedule: Add or Update Slot** → **Run workflow**, then fill in:

- **Slot ID** — lowercase-with-hyphens (e.g. `mon-latin-beginner`). Reuse an ID to update that slot.
- **Day**, **Level** — pick from the dropdown.
- **Start time / End time** — 24-hour format, `HH:MM` (e.g. `18:00`).
- **Class name** in Hebrew, English, and Russian.

### Deleting a Schedule slot

**Actions** tab → **Schedule: Delete Slot** → enter the exact Slot ID.

### Adding an image (for News posts)

The workflow form can't upload files directly — it only accepts an image *URL*. To get a URL for a photo:

1. Go to any GitHub **Issue** in the repo (or open a new one).
2. Drag and drop the image into the comment box — GitHub uploads it and inserts a Markdown image link like `![image](https://github.com/user-attachments/assets/...)`.
3. Copy just the URL (the part in parentheses) and paste it into the workflow's **Image URL** field.
4. You can close the issue without posting the comment — the uploaded image URL stays valid either way.

### A nicer editing experience later (optional upgrade path)

The GitHub Actions forms above are completely free but a little utilitarian (plain text boxes, one workflow per action). If down the line a small budget opens up, the next step up is a proper logged-in CMS screen (e.g. Decap CMS with GitHub OAuth via a free Cloudflare Worker as the auth backend). This still involves no database and no ongoing hosting cost beyond a Cloudflare account, but does require a small one-time setup. Not built by default — ask if this becomes worth doing.

---

## 4. Where to swap in placeholder assets

Several things are placeholders until real content is ready:

| Placeholder | Where | How to replace |
|---|---|---|
| Instructor names/bios/photos | `src/pages/[lang]/instructors.astro` | Replace the `placeholderInstructors` array and photo blocks with real data (consider moving to a content collection like News/Schedule if the roster changes often). |
| Gallery photos | `src/pages/[lang]/gallery.astro` | Replace the placeholder tiles with real `<img>` tags once photos are ready. |
| News/Schedule sample entries | `src/content/news/`, `src/content/schedule/` | These 3 news posts and 5 schedule slots are realistic seed content, not real ones — delete/replace via the GitHub Actions workflows above once real content is ready. |
| Logo files | `public/images/logo-*.png`, `public/favicon.ico` | Already using the real ETUDE logo you provided. If a higher-resolution or updated logo file arrives later, regenerate these sizes from it (512/192/32px square, circular-masked, plus an ICO favicon). |
| Map coordinates | `src/lib/site.ts` → `geo.lat` / `geo.lng` | Currently an approximate Rishon LeZion center point. Update with the exact studio coordinates once available (right-click the exact spot on openstreetmap.org or Google Maps to get precise lat/lng). |

---

## 5. Activating the accessibility widget (Tabnav)

The site includes an inert integration point for the Tabnav accessibility widget (the same provider used on law.ristar.co), plus a full Accessibility Statement page in all 3 languages describing it.

1. Sign up at https://tabnav.com/get-free-widget (free plan is sufficient to start) with `etude.ristar.co` as the domain.
2. Tabnav will email a ready-to-paste `<script>` embed snippet.
3. Open `src/lib/site.ts` and paste it verbatim into `tabnavEmbedCode`:
   ```ts
   tabnavEmbedCode: '<script src="...">...</script>',
   ```
4. Commit and push — the widget will start loading sitewide on the next deploy, and the accessibility icon will appear for visitors.

Until this is set, the integration renders nothing (same inert-until-configured pattern as GA4 below) — the Accessibility Statement page still works and describes the widget for when it's turned on.

## 6. Promotions (free trial class + Olim discount)

Both are configured in `src/lib/site.ts` under `promo`, and shown on the Home page and the Pricing page automatically:

```ts
promo: {
  active: true,           // set to false to hide both promos sitewide
  freeTrialLesson: true,  // set to false to hide just the free-trial line
  olimDiscount: { year1: 90, year2: 50, year3: 15 },
},
```

The discount percentages feed directly into the copy in `src/lib/translations.ts` (`promo.olimBody` per language) — if the numbers ever change, update both the `site.ts` values (used for future logic/consistency) and the wording in `translations.ts` (since the copy is static text, not auto-generated from the numbers).

## 7. Activating Google Analytics (GA4)

Analytics is wired in but inert (no tracking script loads) until a real Measurement ID is set.

1. Create a GA4 property in Google Analytics and copy its Measurement ID (looks like `G-XXXXXXXXXX`).
2. Open `src/lib/site.ts` and set:
   ```ts
   ga4MeasurementId: 'G-XXXXXXXXXX',
   ```
3. Commit and push (or edit directly on GitHub and commit) — the tracking script will start loading on the next deploy.

---

## 8. Activating / changing the contact form

The contact form on the Contact page posts to FormSubmit (formsubmit.co) — no backend required, delivers straight to **2mmedia.il@gmail.com**.

**Important — first submission:** FormSubmit requires confirming the destination email address the first time it receives a submission (it sends a one-time confirmation email/link). Submit a test message through the live contact form once after launch and confirm via that email — after that, all future submissions deliver normally.

To change the destination email or form behavior, edit `formSubmitEndpoint` in `src/lib/site.ts` and the hidden fields in `src/components/ContactForm.astro` (see FormSubmit's docs for available options like redirect pages, subject lines, etc.).

---

## 9. SEO & AI-search files (auto-generated — nothing to maintain by hand)

These are regenerated on every build, always in sync with real content:

- **`/sitemap-index.xml`** and **`/sitemap-0.xml`** — full sitemap with per-language alternate links (via `@astrojs/sitemap`).
- **`/robots.txt`** — points crawlers to the sitemap.
- **`/llms.txt`** — a plain-text summary of the business and every page/post in every language, for AI assistants and crawlers. Generated at build time from the same content as the site itself (see `src/pages/llms.txt.ts`).
- Every page also emits: a unique `<title>` and meta description, canonical URL, `hreflang` alternates for all 3 languages + `x-default`, Open Graph and Twitter Card tags, and `DanceSchool` (LocalBusiness) structured data — with `NewsArticle` structured data added on individual news posts.

---

## 10. Project structure (for developers)

```
src/
  lib/
    site.ts              — central business config: address, phone, hours, socials, GA4 ID,
                            Google Maps link, promo settings, Tabnav embed code, etc.
    languages.ts          — supported languages, RTL/LTR, path helpers
    translations.ts        — all static UI copy in HE/EN/RU (first-pass draft — see note below)
  content.config.ts       — Zod schemas for the News and Schedule collections
  content/
    news/*.json            — one file per news post (edit via GitHub Actions, not by hand)
    schedule/*.json         — one file per class slot (edit via GitHub Actions, not by hand)
  components/              — Header, Footer, SEO tags, JSON-LD, forms, cards, map, etc.
    Testimonials.astro       — homepage testimonials (placeholder quotes — swap in real ones)
    PromoBanner.astro         — free trial class + Olim discount banner (Home + Pricing)
    Faq.astro                  — FAQ accordion with FAQPage schema (Pricing page)
    LanguageBanner.astro        — dismissible "view this site in X" suggestion banner
    AccessibilityWidget.astro    — Tabnav widget embed, inert until configured
  layouts/BaseLayout.astro  — shared page shell: <head>, language banner, header, footer,
                              accessibility widget, WhatsApp button
  pages/
    index.astro             — redirects "/" to the Hebrew default (no-JS meta refresh only)
    [lang]/                  — one folder, three languages generated via getStaticPaths
      index.astro, about.astro, classes.astro, schedule.astro, instructors.astro,
      gallery.astro, pricing.astro, contact.astro, privacy.astro, accessibility.astro,
      news/index.astro, news/[slug].astro
    llms.txt.ts               — generates /llms.txt at build time
.github/
  workflows/
    deploy.yml                  — build & deploy to GitHub Pages on push to main
    news-add-update.yml          — staff-facing form to add/edit a news post
    news-delete.yml               — staff-facing form to delete a news post
    schedule-add-update.yml        — staff-facing form to add/edit a schedule slot
    schedule-delete.yml             — staff-facing form to delete a schedule slot
  scripts/
    update-news.mjs                — validates & writes the news JSON file
    update-schedule.mjs             — validates & writes the schedule JSON file
```

### A note on testimonials

The 3 testimonials on the homepage (`src/components/Testimonials.astro` → `translations.ts`) are clearly-marked **placeholders** — generic roles, not real names — meant only to preview the design. Replace them with real student testimonials (with permission) before launch; don't leave placeholder quotes live on the public site.

### A note on the copy

All Hebrew, English, and Russian page copy in `src/lib/translations.ts` (and the seed News posts) is a **first-pass draft** written to get the site launched with real, usable sentences — not certified translation. Please have a native speaker review it, particularly the Hebrew and Russian, before treating it as final.

### Adding a new page

1. Add the copy to all three language blocks in `src/lib/translations.ts`.
2. Create `src/pages/[lang]/your-page.astro` following the pattern of the existing pages (`getStaticPaths` returning all 3 langs, `<BaseLayout>` wrapper).
3. Add a nav entry in `src/components/Header.astro`'s `navItems` array and a footer link if relevant.
