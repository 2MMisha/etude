# ETUDE management system — PRD (draft for approval)

Status: draft v1, 2026-11-11. Nothing is built yet.
Prices, client records and trainer rates are deliberately **not** in this file: this repository is public. They live only in the database.

## 1. Goal and scope

Replace the Excel files, WhatsApp threads and memory that run the school's money and client records with one system. In order of pain (owner's words): tracking payments, giving receipts, keeping everything about each client in one place.

Scale: 50–60 students, 45–55 paying clients, 4 trainers, 2 halls, one reception admin.

**In scope, staged (section 9):** clients and students, price list and memberships, charges and payments, payment confirmations, debts and reports, trainer accounts with private-lesson records, attendance, earnings and payouts, expenses, parent accounts in the student app, payment reminders, and later the CRM scheduler that replaces the Google Sheet.

**Not built until asked for:** online card payments, WhatsApp API messaging, SMS codes, form builder, file uploads and documents, custom fields, duplicate merging. Each is listed in section 10 with the trigger for adding it.

## 2. What stays exactly as it is

| Part | Decision |
|---|---|
| Public site, SEO, analytics, brand book, studio TV screen | Unchanged, stays on GitHub Pages |
| `/admin/` content panel (news, instructors, site settings, student-app content, push) | Unchanged |
| Google Sheet timetable, hourly rebuild, trainer and student schedule views, calendar feeds | Unchanged until the owner says to switch (stage 6) |
| Student app shared 6-digit code | Stays for the general part; personal data needs a parent login |
| OneSignal push (students, trainers) | Reused for reminders |

## 3. Architecture

```
GitHub repo (code only)                 Supabase project (data only)
├─ public site        ─┐                ├─ Postgres database
├─ /admin/             ├─ GitHub Pages  ├─ Auth (email or username + password)
├─ /crm/      (new)    │   static       ├─ Row-level security = permissions
├─ /trainers/ (+login) │      │         └─ Edge functions (few: password reset
└─ /student/  (+login)─┘      └──────────►  by admin, reminders, backups)
```

- **Database, logins and permissions: Supabase, free plan.** It is a hosted Postgres where access rules are written in the database itself, so "a trainer may change only their own lessons" is enforced on the server even if someone bypasses the screen. No server of our own to run.
- **Screens: new pages in this same Astro site**, under `/crm/`, built the way the existing apps are, with one small UI library (Preact) for the form-heavy CRM screens. The trainer and student apps get a login and new tabs; their current screens are not rewritten.
- **Schema and access rules live in the repo** as SQL migrations under `supabase/`. Secrets live in GitHub and Supabase settings, never in files.
- **All internal pages** are `noindex`, excluded from the sitemap, and show nothing without a login.

### Running cost: 0 ₪/month

| Service | Plan | Limits that matter |
|---|---|---|
| GitHub Pages, Actions | Free | Already in use |
| Supabase | Free | 500 MB database (the school needs a few MB). The project pauses after about a week with no activity; daily use plus a ping from the existing hourly workflow prevents that. No built-in backups |
| OneSignal | Free | Already in use |

Backups: a nightly job exports the database, encrypts it with a key only the owner holds, and stores the last 90 days. A restore is tested once before going live.
Upgrade path if ever needed: Supabase Pro, about $25/month, adds managed daily backups. Limits to be re-checked on the day the project is created.

## 4. Roles and permissions

A person can hold more than one role (Roman and Evgeniia are trainers with admin rights).

| Action | Owner | Admin (reception, trainer-admins) | Trainer | Parent / client |
|---|---|---|---|---|
| Clients, students: view and edit | ✓ | ✓ | own students: name, group, phone only | own family only, view |
| Price list, discounts, trainer rates | ✓ | ✓ | – | – |
| Memberships, charges, price override (comment required) | ✓ | ✓ | – | view own |
| Record payments, issue confirmations | ✓ | ✓ | – | view own |
| Private lessons: create, change | ✓ | ✓ | own only, as a request for approval | view own |
| Approve trainer requests | ✓ | ✓ | – | – |
| Attendance | ✓ | ✓ | own lessons and groups | view own |
| One-time group entry: record | ✓ | ✓ | ✓ own groups | – |
| Trainer earnings | all | all | own only | – |
| Payouts to trainers, expenses (comment required) | ✓ | ✓ | – | – |
| Reports, dashboard, export for the accountant | ✓ | ✓ | – | – |
| User accounts: create, deactivate, reset password | ✓ | ✓ (not the owner's) | – | – |
| Activity log | ✓ | view | – | – |

Every change to money, prices, lessons and accounts is written to the activity log with who, when, before and after.

## 5. Data model

```
clients ──< students ──< enrollments >── groups >── programs (price list)
   │            │
   │            ├──< charges (one line each: a membership month, a private
   │            │     lesson, a one-time entry; list price, discounts, final
   │            │     price, override comment)
   │            └──< attendance >── lessons (private lessons, group sessions)
   │                                   └── trainer(s), type, status
   └──< payments (date, method, amount, cheque no./bank/date, paper doc no.)
            └──< payment_lines >── charges   (what each payment covered)

trainers ──< trainer_rates (per lesson type: fixed ₪ or %)
         ──< trainer_payouts
change_requests (trainer → admin: new / moved / cancelled private lesson)
expenses (amount, category, comment required)
users + roles, notifications_sent, activity_log
```

Rules built into the model:

- **Client ≠ student.** A client pays and is contacted; a student dances. An adult is both, as one client with one student.
- **A membership is per student, per calendar month.** Its suggested price comes from the price table (programme and number of classes a week); for a student in several programmes the suggestion is the sum of those rows. The admin can change it; a comment is then required. The minutes-per-week scale on the price sheet is an illustration only and is not used.
- **Every price is editable by the admin** in Settings: group programmes, private-lesson types, one-time entry, rentals. A change applies to new charges only.
- **Discounts:** second child and full-year prepayment (applied only to full-month memberships), Olim (size set by the admin per student), custom (comment required). The second-child discount goes to the second child, and it adds up with the full-year discount. Each discount is stored on the charge line, so history survives price-list changes.
- **Last year's price column is not used.** One price list, season 2026/27.
- **Private lessons** are charged per lesson by type (Standard, Latin, Assistant). A couple's lesson is split equally between the two students. A lesson can be owed. A late cancellation or no-show is charged; the admin can waive it with a comment.
- **One-time group entry** is a charge created by the admin or the trainer.
- **A payment can cover many lines** (several months, several children, lessons); each appears as its own line.
- **Balance** of a student or family is always calculated from charges and payments, never typed in.
- **Trainer earnings** are calculated per lesson and per group class from that trainer's rate: a fixed amount, a percentage, or an amount the admin simply types in. The CRM shows earned, paid and still owed per trainer.
- **Login is the email address**, for staff, trainers and parents, so every account has one. The admin can change a user's email and reset their password.
- **Hall rentals** can be recorded as a client with a one-off charge; no rental calendar until stage 6.

## 6. Payment confirmations

When a payment is recorded the CRM produces a numbered confirmation with the payer, date, method and every line it covers, in the payer's language, to print or send as a link or PDF.

This is the school's own payment confirmation, as the owner asked. It is not a חשבונית מס/קבלה under tax rules, which for a registered business comes from a paper book or registered software; the payment record has a field for that paper document's number. If the accountant later requires digital documents, a registered invoicing service can be connected without changing the rest.

## 7. Applications

**CRM (`/crm/`, staff, Hebrew / Russian / English, phone and desktop)**
- Clients and students: list, search, filters, family view, notes, status, archive.
- Student page: groups, membership per month, attendance, charges, balance.
- Month view: who is charged what, who paid, who owes; one click to record a payment.
- Payments: cash, transfer, Bit, cheque (number, bank, date), standing order.
- Debts list with a ready WhatsApp message per client.
- Trainer requests waiting for approval; after approval, a "to enter into the Sheet" list (until stage 6).
- Trainers: rates, earnings, payouts. Expenses.
- Reports: income by month, method, programme and trainer; export to Excel for the accountant.
- Dashboard: active students, this month's income and debts, today's lessons, pending requests.
- Settings: price list, discounts, users and roles.

**Trainer app (existing `/trainers/`, plus login)**
- Everything it does today stays available.
- After login: my private lessons, request a new, moved or cancelled lesson, mark attendance, record a one-time entry, my earnings and what has been paid.

**Student app (existing `/student/`, plus parent login)**
- Everything it does today stays behind the shared code.
- After login with a personal username and password: my children (switch between them), membership and what is paid or owed, private lessons, payment confirmations.
- Automatic payment reminders by push, sent once before the due day and once after, only to clients who owe.

## 8. Security and privacy

- Passwords are handled by Supabase Auth (hashed, rate-limited); none are stored by us.
- Access rules are in the database and tested with a script that tries each forbidden action as each role.
- Children's data: only what the school needs (name, birth date, group, parent contact). No records in the repository, in the built site, or in browser storage.
- Known and accepted for now (owner, 2026-11-10): the public timetable file contains private-lesson names. It goes away at stage 6.
- A full security review closes the project (stage 8).

## 9. Roadmap

Each stage ends with a demo on real screens and the owner's approval before the next.

| Stage | Contents | Needs from the owner |
|---|---|---|
| 0. Foundation | Supabase project, schema, logins, roles, access rules and their test, empty CRM shell, backups | Create the Supabase account (free) and add two keys to GitHub; I prepare exact steps |
| 1. Clients and memberships | Clients, students, groups, price list, monthly charges, discounts | The client Excel files, for import |
| 2. Payments | Recording payments, confirmations, debts, reports, accountant export | A sample of what the accountant wants to receive |
| 3. Trainers | Trainer login, private lessons, requests and approval, attendance, one-time entries, earnings, payouts, expenses | Each trainer's rates |
| 4. Parents | Parent login in the student app, balances, reminders | – |
| 5. Dashboard and polish | Dashboard, filters, activity log screen | – |
| 6. Scheduler | CRM calendar replaces the Sheet: recurring classes, conflicts, halls, rentals; apps and TV read from the database | Owner's go-ahead |
| 7. On demand | Items from section 10 | – |
| 8. Security review | Audit, fixes, retest, report | – |

## 10. Deferred, with the trigger for adding each

| Item | Add when |
|---|---|
| Registered digital invoices | The accountant asks, or paper becomes a burden (monthly fee) |
| Online card payments | Clients ask to pay in the app |
| SMS / WhatsApp login codes and automatic WhatsApp messages | A budget exists (paid per message) |
| Registration form builder | After stage 4; until then one fixed trial-lesson form is enough |
| Documents, file uploads, custom fields, duplicate merge | The first real case appears |

## 11. Open questions

None. Answered 2026-11-11: prices come from the price table only, the scale is not used; one-time entry price given (stored in the price list); discounts add up; trainer pay has three modes; email is the login.
