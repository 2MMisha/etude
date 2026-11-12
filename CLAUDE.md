# ETUDE — project guide for Claude

Read this first; it replaces re-auditing the repo. Deeper docs: `info.md` (how the site works, for humans) and `documentation/PRD.md` (the CRM's approved requirements and roadmap). Keep the **Status** section at the bottom current when a stage moves.

## Hard rules

- **This repo is public.** Never commit prices, client or student data, trainer rates, passwords, secret keys, database URLs. Prices live only in the database (typed in `/crm/` → Settings, or seeded by SQL the owner pastes). The Supabase URL and publishable key in `src/lib/crmConfig.ts` are public by design.
- **`main` is the live site.** Every push to `main` deploys etude.ristar.co in ~2 minutes. Work on the `crm` branch, push only when the owner says so.
- **Preserve what works.** The public site, `/admin/`, `/student/`, `/trainers/`, `/display/` and the Google Sheet timetable stay as they are until the owner says otherwise (PRD §2).
- **Ask before each stage.** After a stage: explain, demo, list what is untested, get approval (PRD §9).
- Don't claim something works without testing it; say what could not be tested.

## What this is

ETUDE Dance School, Rishon LeZion (Rothschild 49). About 50–60 students, 45–55 paying clients, 4 trainers (Roman, Evgeniia, Tomer, Misha), 2 halls, one reception admin. Owner: Misha (GitHub `2MMisha`). Languages: Hebrew (default, RTL), Russian, English — all staff and public UI is trilingual.

One Astro 7 static site, one repo, GitHub Pages (`public/CNAME` → etude.ristar.co). No server of our own.

## Map of the repo

| Path | What |
|---|---|
| `src/pages/[lang]/…` | Public marketing site, 3 languages. Copy in `src/lib/translations.ts`, config in `src/lib/site.ts` + `src/data/site-settings.json` |
| `src/pages/admin/index.astro` | Content panel (news, instructors, site settings, student-app content, push, timetable print). Client-side password + GitHub token; saves = commits to `main`. Not the CRM |
| `src/pages/student/index.astro` | Students' PWA behind a shared 6-digit code (deterrent only). Content from `src/data/student-app.json`, logic in `src/lib/student.ts` |
| `src/pages/trainers/`, `src/components/TrainerSchedule.astro` | Trainers' schedule PWA, read-only, no login. `src/lib/trainers.ts` |
| `src/pages/display.astro` | Studio TV screen |
| `src/pages/brand.astro`, `public/brand/` | Brand book and logo pack |
| `src/lib/loadTimetable.ts`, `src/lib/timetable.ts` | Timetable = shared Google Sheet, downloaded as xlsx at build; site rebuilds hourly. Output also at `/data/timetable.json` (public, contains private-lesson names — owner accepted for now) |
| `src/pages/crm/index.astro`, `src/crm/` | **The CRM** (staff). Talks to Supabase from the browser |
| `src/lib/crmConfig.ts` | Supabase project URL + publishable key |
| `supabase/migrations/*.sql` | Database schema and access rules, applied in filename order |
| `supabase/tests/access.test.mjs` | `npm run test:db` — runs all migrations in PGlite and tries forbidden actions as each role, plus pricing checks |
| `.github/workflows/deploy.yml` | Build + deploy on push and hourly; notifies trainers of schedule changes |
| `.github/workflows/notify.yml`, `scripts/notify*.mjs` | OneSignal push (separate apps for students and trainers) |
| `.github/workflows/backup.yml` | Nightly encrypted database dump, kept 90 days as an artifact |
| `documentation/PRD.md` | CRM requirements, data model, permission matrix, roadmap |

Brand tokens are in `src/styles/global.css` (`--color-navy-900 #17224a`, `--color-blue-600 #2f4b9b`, silver greys; fonts Another Shabby for display, Montserrat + Heebo for body). Reuse them; don't invent a look.

## CRM architecture

- **Supabase free plan** (project ref `lilignwfbznhkoxdvcau`): Postgres, Auth (email + password, public sign-up off), row-level security. Running cost must stay 0.
- **Permissions live in the database** (RLS policies and triggers in the migrations), never only in the page. Helpers: `public.has_role(role)`, `public.is_staff()` (owner or admin). Every table gets the `log_change()` trigger → `public.activity_log`.
- **Roles** (`profiles.roles`, an array — a person can hold several): `owner`, `admin`, `trainer`, `client`. Roman and Evgeniia are trainers with admin rights.
- **Frontend:** plain TypeScript modules under `src/crm/`, no UI framework. `h()` builds DOM (text is always set as text). Views are functions returning a node; fields save on change. Routing by `location.hash`. All strings in `src/crm/i18n.ts` in he/ru/en.
- **Logins** are created in the Supabase dashboard (Authentication → Add user) until stage 3 adds in-CRM creation; roles are set in `/crm/` → Accounts.

## Business rules already decided (owner, Nov 2026)

- Client (pays, is contacted) ≠ student (dances). An adult is a client with one student.
- Membership: per student, per calendar month. Price = price-table row for the programme at N classes a week; several programmes = sum; or the Unlimited price. The "minutes per week" scale on the price sheet is illustration only — never use it. Last year's price column is never used.
- Admin may change any price; a hand-set price requires a comment.
- Discounts add up: second child (goes to the second child), full-year prepayment, Olim (size per student), custom (comment required). Only on full-month memberships.
- Private lessons are priced and named by trainer, not by dance type (owner, 2026-11-12): Roman and Evgeniia at the "standard" rate, Tomer at the "Latin" rate, Misha at the "assistant" rate; each in 45 and 60 minutes. The price sheet's Standard / Latin / Assistant rows are those three tiers.
- Private lessons are scheduled ahead (date, time; a trainer cannot be double-booked) and confirmed afterwards: took place / no-show / late cancellation are charged and earn the trainer their part, a lesson cancelled in time costs nothing. Up to four students can share one; the price is split evenly. Before: charged per lesson; a couple splits the price; can be owed; late cancel / no-show is charged. One-time group entry can be recorded by admin or trainer.
- Payments: cash, transfer, Bit, cheque (record number, bank, date), standing order. One payment can cover many lines; each line shown separately.
- Receipts: the CRM issues its own numbered payment confirmation, not a tax document; a field holds the paper document number.
- Trainer pay differs per trainer and lesson type: fixed amount, percentage, or typed by hand. Trainers see their own earnings; admin sees owed/paid, records payouts and expenses (comment required).
- Trainers request private-lesson changes in their app → admin approves → until the scheduler exists, approved changes go on a "to enter into the Sheet" list.
- Login = email for everyone; admin can change it and reset passwords. No SMS/WhatsApp codes (cost).
- Payment reminders: automatic push to clients who owe.

## How to work here

- `npm run dev` (port 4321, launch config `etude-dev`), `npm run build`, `npm run test:db`. There is no `astro check` installed; the build is the type gate.
- **Check `git branch --show-current` before every piece of work and every commit.** The owner uses GitHub Desktop, which can switch the branch and commits *everything* in the working tree, then pushes. On 2026-11-12 the repo was on `main` with half-wired stage 3a screens uncommitted; the owner committed and pushed them, and the live CRM ran against a database without the new tables. So: work on `crm`, commit small and often, never leave `main` checked out with unfinished changes, and apply a migration to the database before the code that needs it can reach `main`.
- **Start by `git fetch`** — the admin panel commits to `main` many times a day, so local `main` is usually behind. Rebase `crm` on `origin/main` before pushing.
- **Pushing:** this shell has no GitHub credentials and no `gh`. Fast-forward local `main`, then the owner presses "Push origin" in GitHub Desktop. GitHub Desktop pushes whichever branch is checked out, so **leave the repo on `main` before asking for the push** (on 2026-11-12 it was left on `crm`, the owner pushed `crm`, and the live site did not change). Afterwards verify with `git fetch` that `origin/main` moved, then switch back to `crm`.
- **Applying a migration:** the owner pastes it into Supabase → SQL Editor (copy it to the clipboard with `LC_ALL=en_US.UTF-8 pbcopy`; plain `pbcopy` mangles non-ASCII such as the multiplication sign, so keep SQL that matters ASCII, using `U&'\00D7'` escapes). Run `npm run test:db` first. Never edit a migration that has been applied; add a new one.
- **Testing the CRM for real** needs the owner's session: they sign in at `http://localhost:4321/crm/` in the browser pane (Claude may not type passwords). Without it only the sign-in form is visible.
- GitHub Actions logs and artifacts need the owner's login; the run summary pages are public.
- The owner is not a developer: give click-by-click steps, one small step at a time, and say what a good result looks like.
- In dev (`npm run dev`) the signed-in Supabase client is `window.crmDb`, for inspecting and cleaning test data from the pane. A hidden browser pane throttles timers: no `setTimeout` waits inside `javascript_tool`.
- Shell quirk: long heredocs containing code can trip the safety checker — use the Write/Edit tools for file content.

## Status

- **Stage 0 — done, live (2026-11-12).** Accounts, roles, activity log, `/crm/` sign-in + Accounts screen, nightly backup (run #2 green). Still unverified: the owner opening a backup with the passphrase; the password-reset email round trip.
- **Stage 1 — done, live (2026-11-12).** Clients, students, groups, price list, monthly charges, discounts, delete buttons (two-click; refused with a plain message when charges or groups hang on the row). Migration `20261112000000_clients_memberships.sql` is applied; the price list and groups were seeded by pasted SQL. Not built: client import from Excel (files not received yet).
- **Stage 2 — done, live (2026-11-12):** payments with lines, family credit, void and refund (both need a reason), numbered confirmation in the client's language with the school details from Settings (business number included, no "not a tax invoice" line — owner's decision), Debts with WhatsApp reminders, monthly report with Excel export, Paid column on Month. Migration `20261113000000_payments.sql` is applied. Confirmation numbering was reset to start at 1 after testing. Not checked by a person yet: printing on paper, the share sheet on a phone, opening the exported Excel file.
- Owner feedback applied (2026-11-12): the Month tab is a read-only overview (no inputs); all money actions are on the client page, which has tabs Details / Payments / Students (`#/client/<id>/<info|pay|students>`). The current month's fees are filled in automatically once a month (`fillThisMonth()` in `src/crm/ui.ts`, marker in `settings.filled_month`); staff-facing wording is "to pay", not "charges". The confirmation prints twice on one A4 sheet (two identical halves) and goes to WhatsApp as a PNG drawn on a canvas (`receiptImage()`), through the share sheet on phones or download + open chat on a computer.
- Payments cannot be deleted through the app by design. Test payments made on the real database are removed only by SQL the owner pastes (delete the TEST client's payments, charges, students, client; then `setval('public.payment_number_seq', 1, false)` if no real payment exists).
- **Stage 3a — code is on `main` and live since 2026-11-12 (pushed early by accident); migration `20261114000000_trainers_lessons.sql` must be applied for it to work.** Trainers with per-length rates (price, pay fixed or percent), dance partners, private-lesson log (`record_lesson`), Trainers tab (earned / given / to give, payouts), expenses and "left over" in Reports, a Confirmation button on each payment. Not yet tested against the real database. Still to do in stage 3: trainer logins and the trainer app (own lessons, requests for approval, attendance, one-time entries, own earnings), pay for group classes, creating logins from the CRM.
- Next after stage 3: 4 parents, 5 dashboard, 6 scheduler (replaces the Sheet, on the owner's word), 7 on-demand items, 8 security review.
