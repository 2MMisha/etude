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

> **Note on the GitHub org:** these instructions assume the repository lives under a GitHub org/account whose handle is close to `ristar.co` (e.g. `ristar-co`, since GitHub handles can't contain dots). If your actual org handle differs, swap it into the `<your-github-org>.github.io` value above and into `src/lib/site.ts` (`githubOrg` and `repoName` fields) — these are also read at runtime by the `/admin/` panel to target the right repo, so keep them accurate.

---

## 3. Editing content without touching code

Four kinds of content are editable by non-technical staff through the site's own hidden, password-protected **admin panel** — no GitHub account needed day-to-day, no Actions tab, no YAML forms:

- **News posts** — announcements, updates
- **Schedule slots** — weekly class times
- **Instructors** — the teaching roster (name, bio, photo, display order)
- **Site settings** — phone, WhatsApp, email, street address, map coordinates, opening hours, Instagram link, Google Maps link, and the homepage/pricing promotions

### Editing content: the admin panel

The panel lives at a URL that isn't linked from anywhere on the public site: **`https://etude.ristar.co/admin/`**. It's excluded from the sitemap and from search engines (`robots.txt` and a `noindex` tag), so the only way in is knowing the address.

**How it works, and why it needs a GitHub token:** this is still a free, static, backend-less site — there's no server or database behind the panel. So the panel is a page that runs entirely in your browser and talks directly to GitHub's API to write the content files, the same files the old Actions workflows used to write. That means two things are required to make a change:

1. **The admin password**, just to open the panel. Set at build time in `src/lib/adminConfig.ts`. To change it, run:
   ```bash
   node scripts/hash-admin-password.mjs "your new password"
   ```
   and paste the printed hash into `ADMIN_PASSWORD_SHA256` in that file, then commit.
2. **A GitHub personal access token**, entered once in the panel and saved in that browser's `localStorage` (never sent anywhere but `api.github.com`). Create a **fine-grained** token at [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new), scoped to **only this repository**, with **Contents: Read and write** permission — nothing else. Without a valid token, the panel can look but can't save.

Because the token is what actually grants write access, the password alone is not a strong security boundary — treat it more like a "don't leave this open on a shared computer" lock than a login system. Whoever holds both the password and a token can edit site content; keep both to trusted staff only, and use "Forget token" / "Lock panel" (buttons inside the panel) when stepping away from a shared machine.

Once unlocked and connected, the panel gives you four tabs:

- **News posts** — a table of existing posts with Edit/Delete, and a "+ New post" form for Post ID, Date, an optional Image URL, and Title/Body in Hebrew, English, and Russian (multi-line bodies are fully supported, unlike the old GitHub form).
- **Schedule slots** — the same list-and-form pattern for Day, Level, Start/End time, and Class name in all three languages.
- **Instructors** — the same pattern for an Instructor ID, a display order number (lowest shows first on the Instructors page), an optional photo URL, and Name/Bio in all three languages.
- **Site settings** — a single form (no list — there's only one settings file) for phone, WhatsApp, email, street address, map latitude/longitude, opening hours, Instagram link, Google Maps link, and the promo toggles. Everything else about the site (domain, branding text, page copy, which weekdays are listed in the schema.org data) stays developer-only in `src/lib/site.ts`, since those fields are one-time setup rather than things that change often.

Saving anything writes a commit straight to `main`, which triggers `deploy.yml` exactly as before — the live site rebuilds within about 1–2 minutes. For News/Schedule/Instructors, reusing an existing ID overwrites that entry (that's how you edit one), and deleting asks for confirmation first.

### Weekly timetable (Google Sheet) and the studio display screen

**Source of truth: the shared Google Sheet** ("לוח זמנים 2026-2027", ID in `src/lib/loadTimetable.ts`) — one tab per week. Every build downloads it as .xlsx and parses it (`src/lib/timetable.ts`), using weeks from 4 Oct 2026 on; `deploy.yml` rebuilds the site **every hour**, so edits to the sheet reach the screen within about an hour. The admin panel's **Timetable (Google Sheet)** tab links to the sheet, lists every week/day exactly as the screen sees it (rentals highlighted), and has an **Update now** button that rebuilds right away (an empty commit — needs only the token's Contents permission).

- The sheet must stay shared as "anyone with the link can view".
- When starting a new week tab from a copy, update its **"Week of"** cell — the dates under the day names come from it, and a tab repeating another tab's dates is ignored (the build log says which dates).
- Class names and column labels are shown exactly as typed in the sheet. Columns whose label contains "rent" are hall rentals: amber, hatched, with a 🔑 on the screen.
- If the sheet can't be downloaded, the build falls back to `src/data/timetable.json` (a saved earlier week) instead of failing.
- GitHub pauses scheduled workflows after 60 days without commits — any commit (e.g. an admin-panel save or **Update now**) re-enables them.

**`/display/`** — a full-screen "today's classes" page for the TV in the studio: clock, the class in progress with a progress bar, what's next, and the day's list (past classes dimmed). Once the day is over it shows tomorrow. It re-checks `/data/timetable.json` every 2 minutes, so the TV never needs reloading. Options: `?lang=en` / `?lang=ru` (Hebrew by default), `?rent=0` to hide rentals, `?date=2026-10-05&time=18:20` to preview a moment. If a date isn't in the sheet, it falls back to the same weekday of the latest week (and says so). Not linked anywhere, `noindex`, excluded from the sitemap and `robots.txt`.

The screen cycles the language he → ru → en every minute (`?lang=` pins one), and for 2 minutes out of every 10 (minutes x8–x9) shows the whole week instead of today (`?view=today|week` pins one). Coloured background blobs drift slowly (transform-only animation, light enough for smart-TV browsers).

**`/trainers/`** — weekly schedule of the whole studio, and **`/trainers/<name>/`** — one page per trainer (one per teacher column in the sheet; a new column gets its page on the next rebuild). Week-by-week navigation, language from the device (he/ru/en, switchable, remembered), responsive from phones to desktops. Each class has "Add to Google Calendar" and ".ics" buttons; the **Add to calendar** menu offers a subscription feed (`/trainers/<name>.ics`, or `/trainers/all.ics`) that calendar apps re-check, so changes in the sheet reach trainers' calendars by themselves. Not linked from the public site, `noindex`, not in the sitemap (and deliberately not blocked in `robots.txt`, so calendar apps can fetch the feeds).

The public **Schedule page** is separate: it lists the **Schedule slots** managed in the admin panel.

### Adding an image (for News posts)

The panel's Image URL field still only accepts a URL, not a file upload. To get a URL for a photo:

1. Go to any GitHub **Issue** in the repo (or open a new one).
2. Drag and drop the image into the comment box — GitHub uploads it and inserts a Markdown image link like `![image](https://github.com/user-attachments/assets/...)`.
3. Copy just the URL (the part in parentheses) and paste it into the panel's **Image URL** field.
4. You can close the issue without posting the comment — the uploaded image URL stays valid either way.

---

## 4. Where to swap in placeholder assets

Several things are placeholders until real content is ready:

| Placeholder | Where | How to replace |
|---|---|---|
| Instructor roster | admin panel → **Instructors** tab | There are no seed instructors — the Instructors page shows an empty-state notice until at least one is added via the panel. |
| News posts / Schedule slots | admin panel → **News posts** / **Schedule slots** tabs | There is no seed content — both pages show their real empty-state message ("no updates yet" / "full schedule coming soon") until staff add real entries via the panel. |
| Logo files | `public/images/brand/*.svg`, `public/images/apple-touch-icon.png`, `public/images/logo-mark-512.png`, `public/favicon.ico` | Using the real ETUDE brand mark (a hand-lettered "ETUDE" wordmark + "E" monogram, brand blue `#2f4b9b`). If an updated logo file arrives later, drop the new SVGs into `public/images/brand/` and regenerate the raster sizes (favicon, apple-touch-icon, `logo-mark-512.png`, `og-default.jpg`) from the new `icon.svg`/`logo-full.svg` — there's no automated script for this yet, it was done by hand with a one-off Python/cairosvg pass. |
| Map coordinates | admin panel → **Site settings** tab (backed by `src/data/site-settings.json`) | Currently an approximate Rishon LeZion center point. Update with the exact studio coordinates once available (right-click the exact spot on openstreetmap.org or Google Maps to get precise lat/lng) — no code edit needed. |

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

## 6. Promotions (free trial class + Olim offer)

Both are toggled from the admin panel → **Site settings** (backed by `src/data/site-settings.json` under `promo`) and shown on the Home and Pricing pages:

```json
"promo": {
  "active": true,          // false hides all promos sitewide
  "freeTrialLesson": true, // false hides the free-trial offer, and the "free" wording in CTAs and the FAQ
  "olimOffer": true        // false hides the new-immigrants offer
}
```

The Olim offer deliberately publishes no discount percentages — the copy (`promo.olimBody` and the FAQ answer in `src/lib/translations.ts`) only says special terms exist and asks visitors to get in touch.

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
- All internal links, canonicals and hreflang URLs end in `/` (`localizePath()` in `src/lib/languages.ts`) — GitHub Pages 301-redirects the slash-less form, and a canonical pointing at a redirect is an SEO error. `/` itself renders the Hebrew homepage (canonical → `/he/`) instead of a meta-refresh redirect.
- Every page also emits: a unique `<title>` and meta description (trimmed to 160 characters), canonical URL, `hreflang` alternates for all 3 languages + `x-default`, Open Graph and Twitter Card tags, and `DanceSchool` (LocalBusiness) structured data — with `NewsArticle` structured data added on individual news posts.

---

## 10. Project structure (for developers)

```
src/
  lib/
    site.ts              — central business config: domain, branding text, and everything pulled
                            in from data/site-settings.json (address, phone, hours, socials, promo)
    languages.ts          — supported languages, RTL/LTR, path helpers
    translations.ts        — all static UI copy in HE/EN/RU (first-pass draft — see note below)
    adminConfig.ts          — admin panel password hash + target branch
  data/
    site-settings.json    — the subset of site.ts staff can edit via the admin panel's
                            "Site settings" tab (contact info, hours, social links, promos)
  content.config.ts       — Zod schemas for the News, Schedule, and Instructors collections
  content/
    news/*.json            — one file per news post (edit via the /admin/ panel, not by hand)
    schedule/*.json         — one file per class slot (edit via the /admin/ panel, not by hand)
    instructors/*.json       — one file per instructor (edit via the /admin/ panel, not by hand)
  components/              — Header, Footer, SEO tags, JSON-LD, forms, cards, map, etc.
    Testimonials.astro       — homepage testimonials (placeholder quotes — swap in real ones)
    PromoBanner.astro         — free trial class + Olim offer banner (Home + Pricing)
    Faq.astro                  — FAQ accordion with FAQPage schema (Pricing page)
    LanguageBanner.astro        — dismissible "view this site in X" suggestion banner
    AccessibilityWidget.astro    — Tabnav widget embed, inert until configured
  layouts/BaseLayout.astro  — shared page shell: <head>, language banner, header, footer,
                              accessibility widget, WhatsApp button
  pages/
    index.astro             — redirects "/" to the Hebrew default (no-JS meta refresh only)
    [lang]/                  — one folder, three languages generated via getStaticPaths
      index.astro, about.astro, classes.astro, schedule.astro, instructors.astro,
      pricing.astro, contact.astro, privacy.astro, accessibility.astro,
      news/index.astro, news/[slug].astro
    admin/index.astro         — hidden, password + GitHub-token gated content panel (not in nav,
                                 excluded from the sitemap and robots.txt)
    llms.txt.ts               — generates /llms.txt at build time
scripts/
  hash-admin-password.mjs   — prints the SHA-256 hash for a new admin password
.github/
  workflows/
    deploy.yml                  — build & deploy to GitHub Pages on push to main
```

### A note on testimonials

The 3 testimonials on the homepage (`src/components/Testimonials.astro` → `translations.ts`) are clearly-marked **placeholders** — generic roles, not real names — meant only to preview the design. Replace them with real student testimonials (with permission) before launch; don't leave placeholder quotes live on the public site.

### A note on the copy

All Hebrew, English, and Russian page copy in `src/lib/translations.ts` is a **first-pass draft** written to get the site launched with real, usable sentences — not certified translation. Please have a native speaker review it, particularly the Hebrew and Russian, before treating it as final.

### Adding a new page

1. Add the copy to all three language blocks in `src/lib/translations.ts`.
2. Create `src/pages/[lang]/your-page.astro` following the pattern of the existing pages (`getStaticPaths` returning all 3 langs, `<BaseLayout>` wrapper).
3. Add a nav entry in `src/components/Header.astro`'s `navItems` array and a footer link if relevant.
