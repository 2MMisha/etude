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
- The work branch `crm` has **no upstream on purpose** (`git branch --unset-upstream crm`): it is rebased onto `main` all the time, so a published copy always looks "diverged" in GitHub Desktop and invites a pull that conflicts (on 2026-11-12 that left conflict markers committed in this file). Only `main` is ever pushed.
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
- **Stage 3a — on `main` and live (pushed early by accident on 2026-11-12); migrations up to `20261115000000_lesson_scheduling.sql` are applied.** Trainers with per-length rates (price; pay fixed or percent), dance partners, expenses and "left over" in Reports, Trainers tab (earned / given / to give, payouts), a Confirmation button on each payment. Tested against the real database: rates in Settings, partner link, expense and payout add/delete, scheduling and confirming a lesson for a couple.
- **Schedule is editable beyond private lessons (2026-11-13, migration `20261118000000_schedule_changes_rentals.sql`, applied):** clicking a group class changes it for one date (`group_slot_changes`: other day, time, hall, trainer, or cancelled; shown with a pencil mark) or every week (`group_slots`); `group_classes_between(d1, d2)` returns the classes as they really are and is what the grid and the trainer-clash rule use. Hall rentals (`rentals`: who, when, hall, optional price as a note only, not charged) are added from a form and drawn with the grid's rental look. A planned lesson's trainer can be changed, which switches it to that trainer's price and pay. All tested against the real database.
- **Trainer logins (stage 3b, migration `20261120000000_trainer_access.sql` applied, tested against the real database 2026-11-13):** the owner's own account now has the Trainer role and is the login of trainer Misha (done with his permission); the other three trainers have no login yet. Tested as that trainer: confirm a past lesson (charge created, earnings up), ask to move (shows in the CRM requests list), ask for a lesson and withdraw it; and on the admin side approving a new lesson and a move. Still to do in stage 3: pay for group classes with attendance, creating logins from inside the CRM. the owner decided everything for trainers lives in the trainers' app, so there is a page `/trainers/me/` (`src/pages/trainers/me.astro`, script `src/crm/trainer.ts`, linked from the app header) — sign in, confirm past lessons, ask to move or cancel a planned one, ask for a new one, see earnings. A trainer never reads tables: only the security-definer `trainer_*` functions, which resolve the caller through `my_trainer_id()` (`trainers.user_id` + the trainer role). New lessons arrive as status `requested`; moves and cancellations as rows in `lesson_requests`; the admin decides on the Schedule tab (`decide_lesson_request`). A login is linked to a trainer in Settings. Sign-in forms are shared in `src/crm/auth.ts`, the CRM styles in `src/styles/crm.css`. The trainers' schedule in the app still comes from the Google Sheet.
- **One-time groups, entries, non-client payments (2026-11-13, migration `20261119000000_events_entries_guests.sql`, applied):** `events` = a one-off class on the schedule (star mark) with a price per entry; `entries` = one person once, to an event or to a regular group class on a date — a client's student (creates a charge of kind `entry`) or a guest by name; `add_entry(e)`. `payments.client_id` is now nullable: a non-client payment carries `payer_name`, `what`, and `entry_id` or `rental_id`; `record_payment` takes those; such a payment has no lines, prints a normal confirmation, shows in Reports, and is voided from its confirmation page. Tested against the real database up to the Record payment button (no test payment was recorded, because payments cannot be deleted and real ones exist); the guest confirmation itself is unverified.
- **Stage 3 work, live (2026-11-13):** lessons are scheduled first (`planned`) and charged only when confirmed (`set_lesson_status`); up to four students share a lesson; the Lessons tab became the **Schedule** tab — one week on the shared time grid (`src/lib/weekGrid.ts`) with group classes from `group_slots` (weekday, time, hall, trainer; edited in Settings) and the week's private lessons (`src/crm/views/schedule.ts`). Halls are shown, not policed (several lessons share a hall); only a trainer's own overlaps are refused. Migrations `20261116000000_lesson_up_to_four.sql` and `20261117000000_week_schedule.sql` are applied, with the weekly slots seeded (16 of 18 matched: the owner had renamed some groups). Tested against the real database: the week grid, scheduling a three-student lesson from it, confirm / back to planned / move / cancel / delete, adding and deleting a class time in Settings. The Sheet is still the timetable the public site, trainers' and students' apps read. Still to do in stage 3: trainer logins and app, group-class pay with attendance, one-time entries, creating logins from the CRM.
- Next after stage 3: 4 parents, 5 dashboard, 6 scheduler (replaces the Sheet, on the owner's word), 7 on-demand items, 8 security review.
