// Tries each forbidden action as each role against the real migrations, in an
// in-process Postgres (PGlite) — no Docker, no Supabase project needed.
//   npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();

// The parts of Supabase the migrations lean on: its roles, auth.users and auth.uid().
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated;
`);

const dir = new URL('../migrations/', import.meta.url);
for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(new URL(f, dir), 'utf8'));

const id = (n) => `00000000-0000-0000-0000-00000000000${n}`;
const U = { owner: id(1), admin: id(2), trainer: id(3), client: id(4), nobody: id(5) };
for (const [name, uid] of Object.entries(U)) {
  await db.query('insert into auth.users (id, email) values ($1, $2)', [uid, `${name}@test`]);
  if (name !== 'nobody') await db.query('update public.profiles set roles = $1::public.app_role[] where id = $2', [`{${name}}`, uid]);
}

/** Run one statement as a logged-in user (or as an anonymous visitor). */
async function as(who, sql, params = []) {
  const uid = U[who];
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}; select set_config('request.jwt.claims', '${uid ? JSON.stringify({ sub: uid }) : ''}', false);`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`);
  }
}
const denied = (p, why) => assert.rejects(p, why);
const count = async (who, table) => (await as(who, `select count(*)::int n from public.${table}`)).rows[0].n;
const setRoles = (who, target, roles) => as(who, 'update public.profiles set roles = $1::public.app_role[] where id = $2', [roles, U[target]]);

// Not logged in: nothing at all.
await denied(as('anon', 'select * from public.profiles'), /permission denied/);
await denied(as('anon', 'select * from public.activity_log'), /permission denied/);

// A login with no role, a client and a trainer each see only themselves.
for (const who of ['nobody', 'client', 'trainer']) {
  assert.equal(await count(who, 'profiles'), 1, `${who} sees only their own profile`);
  assert.equal(await count(who, 'activity_log'), 0, `${who} cannot read the log`);
}
// …may change their own language, but not their role, and not anyone else.
await as('trainer', `update public.profiles set lang = 'ru' where id = $1`, [U.trainer]);
await denied(setRoles('trainer', 'trainer', '{trainer,admin}'), /only staff/);
await denied(as('trainer', `update public.profiles set email = 'owner@test' where id = $1`, [U.trainer]), /login email/);
await denied(setRoles('nobody', 'nobody', '{owner}'), /only staff/);
assert.equal((await setRoles('trainer', 'client', '{}')).affectedRows, 0, "a trainer cannot touch another account");
await denied(as('client', 'delete from public.profiles'), /permission denied/);
await denied(as('client', `insert into public.profiles (id) values ('${id(9)}')`), /permission denied/);

// Admin: sees everyone, manages accounts — except the owner's, and cannot make an owner.
assert.equal(await count('admin', 'profiles'), 5);
await setRoles('admin', 'trainer', '{trainer,admin}');
await denied(setRoles('admin', 'owner', '{}'), /only the owner/);
await denied(setRoles('admin', 'admin', '{admin,owner}'), /only the owner/);
await denied(as('admin', 'delete from public.activity_log'), /permission denied/);
await denied(as('admin', `update public.activity_log set action = 'x'`), /permission denied/);

// Owner: can do both.
await setRoles('owner', 'trainer', '{trainer}');
await as('owner', 'update public.profiles set active = false where id = $1', [U.admin]);

// A deactivated admin is an ordinary login again.
assert.equal(await count('admin', 'profiles'), 1, 'deactivated admin sees only themselves');
assert.equal((await setRoles('admin', 'client', '{admin}')).affectedRows, 0, 'deactivated admin cannot manage accounts');
await denied(as('admin', 'update public.profiles set active = true where id = $1', [U.admin]), /only staff/); // nor switch themselves back on

// Every change above is in the log, with who made it.
const log = (await as('owner', `select actor, new ->> 'active' active from public.activity_log where row_id = $1 order by id desc limit 1`, [U.admin])).rows[0];
assert.deepEqual(log, { actor: U.owner, active: 'false' });

// ── Stage 1: clients, students, prices, monthly charges ──────────────────────
await db.query('update public.profiles set active = true where id = $1', [U.admin]); // back on for this part
const one = async (who, sql, params) => (await as(who, sql, params)).rows[0];
const ins = (table, row) =>
  one('admin', `insert into public.${table} (${Object.keys(row)}) values (${Object.keys(row).map((_, i) => `$${i + 1}`)}) returning *`, Object.values(row));

const kids = await ins('programs', { name: 'Kids', minutes: 45 });
const hobby = await ins('programs', { name: 'Hobby', minutes: 60 });
await ins('prices', { kind: 'group', program_id: kids.id, per_week: 1, amount: 100 });
await ins('prices', { kind: 'group', program_id: kids.id, per_week: 2, amount: 180 });
await ins('prices', { kind: 'group', program_id: hobby.id, per_week: 1, amount: 133 });
await ins('prices', { kind: 'unlimited', amount: 500 });
const kidsBeg = await ins('groups', { name: 'Kids Beg', program_id: kids.id });
const kidsAdv = await ins('groups', { name: 'Kids Adv', program_id: kids.id });
const solo = await ins('groups', { name: 'Hobby Solo', program_id: hobby.id });
await as('admin', `update public.settings set value = '5' where id in ('second_child_pct', 'full_year_pct')`);

const family = await ins('clients', { full_name: 'Parent' });
const a = await ins('students', { client_id: family.id, full_name: 'Child A' });
const b = await ins('students', { client_id: family.id, full_name: 'Child B', second_child: true, full_year: true });
const c = await ins('students', { client_id: family.id, full_name: 'Child C' });
const quote = (s) => one('admin', 'select description, list_amount::float, discounts, amount::float from public.student_quotes where student_id = $1', [s.id]);

// No groups yet: nothing to charge.
assert.equal((await quote(a)).amount, null);
// One group twice a week = the programme's 2-a-week price.
await ins('enrollments', { student_id: a.id, group_id: kidsBeg.id, per_week: 2 });
assert.deepEqual(await quote(a), { description: 'Kids 2×45', list_amount: 180, discounts: {}, amount: 180 });
// Two groups of one programme count together; a second programme is added on top;
// second child + full year add up to 10%, rounded to a whole shekel.
await ins('enrollments', { student_id: b.id, group_id: kidsBeg.id });
await ins('enrollments', { student_id: b.id, group_id: kidsAdv.id });
await ins('enrollments', { student_id: b.id, group_id: solo.id });
assert.deepEqual(await quote(b), { description: 'Hobby 1×60 + Kids 2×45', list_amount: 313, discounts: { second_child: 5, full_year: 5 }, amount: 282 });
// A combination with no price row has no suggestion (Hobby twice a week isn't priced here).
await ins('enrollments', { student_id: c.id, group_id: solo.id, per_week: 2 });
assert.equal((await quote(c)).amount, null);
// Unlimited replaces the sum; Olim and custom discounts are per student.
await as('admin', `update public.students set unlimited = true, olim_pct = 10 where id = $1`, [c.id]);
assert.deepEqual(await quote(c), { description: '∞', list_amount: 500, discounts: { olim: 10 }, amount: 450 });
await denied(as('admin', 'update public.students set custom_pct = 15 where id = $1', [a.id]), /custom_discount_needs_comment/);
await as('admin', `update public.students set custom_pct = 15, custom_comment = 'staff family' where id = $1`, [a.id]);
assert.equal((await quote(a)).amount, 153);

// Month charges: one line per student, once; a second run adds nothing.
const month = (who) => one(who, `select public.create_month_charges('2026-11-17') n`);
assert.equal((await month('admin')).n, 3);
assert.equal((await month('admin')).n, 0);
const line = await one('admin', `select month::text, amount::float, list_amount::float, discounts, manual from public.charges where student_id = $1`, [b.id]);
assert.deepEqual(line, { month: '2026-11-01', amount: 282, list_amount: 313, discounts: { second_child: 5, full_year: 5 }, manual: false });
// A later price change doesn't touch lines already charged.
await as('admin', 'update public.prices set amount = 999 where program_id = $1', [hobby.id]);
assert.equal((await one('admin', 'select amount::float from public.charges where student_id = $1', [b.id])).amount, 282);
// A price set by hand must say why.
await denied(as('admin', 'update public.charges set amount = 50, manual = true where student_id = $1', [a.id]), /manual_price_needs_comment/);
await as('admin', `update public.charges set amount = 50, manual = true, comment = 'joined on the 20th' where student_id = $1`, [a.id]);
// An archived student is not charged.
await as('admin', 'update public.students set archived = true where id = $1', [c.id]);
assert.equal((await one('admin', `select public.create_month_charges('2026-12-01') n`)).n, 2);
// A client with students can't be deleted, only archived.
await denied(as('admin', 'delete from public.clients where id = $1', [family.id]), /foreign key/);

// Everyone else: sees nothing, changes nothing.
const TABLES = ['clients', 'students', 'programs', 'groups', 'prices', 'enrollments', 'settings', 'charges', 'student_quotes'];
for (const table of TABLES) {
  await denied(as('anon', `select * from public.${table}`), /permission denied/);
  for (const who of ['trainer', 'client', 'nobody']) assert.equal(await count(who, table), 0, `${who} reads nothing from ${table}`);
}
for (const who of ['trainer', 'client', 'nobody']) {
  await denied(as(who, `insert into public.clients (full_name) values ('x')`), /row-level security/);
  await denied(as(who, `insert into public.charges (student_id, month, amount) values ($1, '2027-01-01', 1)`, [a.id]), /row-level security/);
  assert.equal((await as(who, 'update public.prices set amount = 1')).affectedRows, 0);
  assert.equal((await as(who, 'delete from public.charges')).affectedRows, 0);
  assert.equal((await month(who)).n, 0, `${who} cannot create month charges`);
}
// The money trail: who set the manual price.
const trail = await one('owner', `select actor, new ->> 'comment' note from public.activity_log where table_name = 'charges' and action = 'update' order by id desc limit 1`);
assert.deepEqual(trail, { actor: U.admin, note: 'joined on the 20th' });

console.log('access rules: all checks passed');
