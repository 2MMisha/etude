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

// ── Stage 2: payments, lines, balances, credit ───────────────────────────────
// Where things stand: Child A owes 50 (Nov, by hand) + 153 (Dec); Child B 282 (Nov) + 1061 (Dec, after the
// price change above); Child C 450 (Nov). 1996 in all.
const chargeOf = async (s, m) => (await one('admin', 'select id from public.charges where student_id = $1 and month = $2', [s.id, m])).id;
const [aNov, aDec, bNov, cNov] = [await chargeOf(a, '2026-11-01'), await chargeOf(a, '2026-12-01'), await chargeOf(b, '2026-11-01'), await chargeOf(c, '2026-11-01')];
const pay = (who, p, lines) => one(who, 'select public.record_payment($1::jsonb, $2::jsonb) id', [JSON.stringify({ client_id: family.id, method: 'cash', ...p }), JSON.stringify(lines)]);
const balance = async () => one('admin', 'select charged::float, paid::float, balance::float, credit::float from public.client_balances where client_id = $1', [family.id]);
const owed = async (id) => (await one('admin', 'select owed::float from public.charge_balances where charge_id = $1', [id])).owed;
assert.deepEqual(await balance(), { charged: 1996, paid: 0, balance: 1996, credit: 0 });

// One payment covers several lines, each its own row; the rest is the family's credit.
const p1 = (await pay('admin', { amount: 400 }, [{ charge_id: aNov, amount: 50 }, { charge_id: bNov, amount: 200 }])).id;
assert.equal(await owed(aNov), 0);
assert.equal(await owed(bNov), 82);
assert.deepEqual(await balance(), { charged: 1996, paid: 400, balance: 1596, credit: 150 });
// Confirmation numbers go up and are never handed out twice.
const p2 = (await pay('admin', { amount: 82, method: 'cheque', cheque_number: '0012', cheque_bank: 'Leumi' }, [{ charge_id: bNov, amount: 82 }])).id;
const numbers = (await as('admin', 'select number::int from public.payments order by number')).rows.map((r) => r.number);
assert.deepEqual(numbers, [1, 2]);
// Refused, and nothing is half-saved: paying a charge twice, lines above the payment, someone else's charge.
await denied(pay('admin', { amount: 10 }, [{ charge_id: bNov, amount: 10 }]), /paid twice/);
await denied(pay('admin', { amount: 10 }, [{ charge_id: aDec, amount: 11 }]), /more than the payment/);
const stranger = await ins('clients', { full_name: 'Other family' });
await denied(one('admin', 'select public.record_payment($1::jsonb, $2::jsonb)', [JSON.stringify({ client_id: stranger.id, method: 'cash', amount: 10 }), JSON.stringify([{ charge_id: aDec, amount: 10 }])]), /another client/);
assert.equal(await count('admin', 'payments'), 2);
// The credit goes to the oldest unpaid charge: Child C's November.
assert.equal((await one('admin', 'select public.use_credit($1)::float used', [family.id])).used, 150);
assert.equal(await owed(cNov), 300);
assert.equal(await owed(aDec), 153);
assert.equal((await balance()).credit, 0);
// A recorded payment can't be re-priced or deleted; a mistake is voided with a reason and stops counting.
await denied(as('admin', 'update public.payments set amount = 1 where id = $1', [p2]), /cannot be changed/);
await denied(as('admin', 'delete from public.payments where id = $1', [p2]), /permission denied/);
await denied(as('admin', 'delete from public.payment_lines'), /permission denied/);
await denied(as('admin', 'update public.payments set voided = true where id = $1', [p2]), /void_needs_reason/);
await as('admin', `update public.payments set voided = true, void_reason = 'typed twice' where id = $1`, [p2]);
assert.equal(await owed(bNov), 82);
await denied(as('admin', 'update public.payments set voided = false where id = $1', [p2]), /stays voided/);
// A refund is a negative payment and must say why.
await denied(pay('admin', { amount: -50 }, [{ charge_id: aNov, amount: -50 }]), /refund_needs_comment/);
await pay('admin', { amount: -50, comment: 'left after one class' }, [{ charge_id: aNov, amount: -50 }]);
assert.equal(await owed(aNov), 50);
assert.deepEqual(await balance(), { charged: 1996, paid: 350, balance: 1646, credit: 0 });
// A charge that has been paid can't be deleted.
await denied(as('admin', 'delete from public.charges where id = $1', [bNov]), /foreign key/);

// Everyone else: no money in, none out, nothing to see.
for (const table of ['payments', 'payment_lines', 'charge_balances', 'client_balances']) {
  await denied(as('anon', `select * from public.${table}`), /permission denied/);
  for (const who of ['trainer', 'client', 'nobody']) assert.equal(await count(who, table), 0, `${who} reads nothing from ${table}`);
}
for (const who of ['trainer', 'client', 'nobody']) {
  await denied(pay(who, { amount: 5 }, []), /row-level security/);
  assert.equal((await as(who, `update public.payments set voided = true, void_reason = 'x'`)).affectedRows, 0);
  assert.equal((await one(who, 'select public.use_credit($1)::float used', [family.id])).used, 0);
}
assert.deepEqual(await one('owner', `select actor, new ->> 'void_reason' why from public.activity_log where table_name = 'payments' and action = 'update' order by id desc limit 1`), { actor: U.admin, why: 'typed twice' });

// ── Stage 3a: trainers, rates, couples, private lessons, earnings, expenses ───
const roman = await ins('trainers', { full_name: 'Roman' });
const misha = await ins('trainers', { full_name: 'Misha' });
await ins('trainer_rates', { trainer_id: roman.id, minutes: 45, price: 250, pay_kind: 'percent', pay_value: 100 });
await ins('trainer_rates', { trainer_id: misha.id, minutes: 45, price: 150, pay_kind: 'fixed', pay_value: 100 });
await ins('trainer_rates', { trainer_id: misha.id, minutes: 60, price: 200, pay_kind: 'percent', pay_value: 60 });
const lesson = (who, l, students) => one(who, 'select public.record_lesson($1::jsonb, $2::uuid[]) id', [JSON.stringify(l), students]);
const privates = async (s) => (await as('admin', `select amount::float, description, day::text from public.charges where student_id = $1 and kind = 'private' order by created_at`, [s.id])).rows;
const earned = async (t) => one('admin', 'select earned::float, paid::float, owed::float from public.trainer_balances where trainer_id = $1', [t.id]);

// One student: the full price; the trainer gets the percentage.
const l1 = (await lesson('admin', { trainer_id: roman.id, minutes: 45, held_on: '2026-11-10', status: 'done' }, [a.id])).id;
assert.deepEqual(await privates(a), [{ amount: 250, description: 'Roman 45′', day: '2026-11-10' }]);
assert.deepEqual(await earned(roman), { earned: 250, paid: 0, owed: 250 });
// A couple: half each, on each one's own family; the trainer gets the fixed amount once.
const partner = await ins('students', { client_id: stranger.id, full_name: 'Partner' });
await lesson('admin', { trainer_id: misha.id, minutes: 45, status: 'no_show' }, [b.id, partner.id]);
assert.equal((await privates(b))[0].amount, 75);
assert.equal((await privates(partner))[0].amount, 75);
assert.equal((await earned(misha)).earned, 100);
// A price typed by hand overrides the rate; the percentage follows it.
await lesson('admin', { trainer_id: misha.id, minutes: 60, price: 300, status: 'done' }, [b.id]);
assert.equal((await earned(misha)).earned, 280);
// Refused: no rate for that length, no students, three students.
await denied(lesson('admin', { trainer_id: roman.id, minutes: 90 }, [a.id]), /no price/);
await denied(lesson('admin', { trainer_id: roman.id, minutes: 45 }, []), /one to four students/);
const fourth = await ins('students', { client_id: stranger.id, full_name: 'Fourth' });
const fifth = await ins('students', { client_id: stranger.id, full_name: 'Fifth' });
await denied(lesson('admin', { trainer_id: roman.id, minutes: 45 }, [a.id, b.id, partner.id, fourth.id, fifth.id]), /one to four students/);
// Three or four share the price; the parts always add up to it exactly.
const trio = (await lesson('admin', { trainer_id: roman.id, minutes: 45, held_on: '2026-11-11', status: 'done' }, [fourth.id, fifth.id, partner.id])).id;
const parts = (await as('admin', 'select amount::float from public.charges where lesson_id = $1 order by amount desc', [trio])).rows.map((r) => r.amount);
assert.deepEqual(parts, [83.34, 83.33, 83.33]);
const quartet = (await lesson('admin', { trainer_id: roman.id, minutes: 45, held_on: '2026-11-12', status: 'done' }, [a.id, fourth.id, fifth.id, partner.id])).id;
assert.deepEqual((await as('admin', 'select amount::float from public.charges where lesson_id = $1', [quartet])).rows.map((r) => r.amount), [62.5, 62.5, 62.5, 62.5]);
await as('admin', 'delete from public.lessons where id in ($1, $2)', [trio, quartet]); // keep the sums below as they were
// Deleting a lesson takes its charges with it - unless one is already paid.
const l4 = (await lesson('admin', { trainer_id: roman.id, minutes: 45, status: 'done' }, [a.id])).id;
await as('admin', 'delete from public.lessons where id = $1', [l4]);
assert.equal((await privates(a)).length, 1);
const paidCharge = (await one('admin', 'select id from public.charges where lesson_id = $1', [l1])).id;
await pay('admin', { amount: 250 }, [{ charge_id: paidCharge, amount: 250 }]);
await denied(as('admin', 'delete from public.lessons where id = $1', [l1]), /foreign key/);

// A lesson is scheduled first: planned costs nothing and earns nothing…
const before = (await earned(roman)).earned;
const plan = (await lesson('admin', { trainer_id: roman.id, minutes: 45, held_on: '2026-12-01', start_time: '17:00' }, [b.id, partner.id])).id;
const status = (id, st) => as('admin', 'select public.set_lesson_status($1, $2)', [id, st]);
const lessonCharges = async (id) => (await as('admin', 'select amount::float from public.charges where lesson_id = $1 order by amount', [id])).rows.map((r) => r.amount);
assert.deepEqual(await lessonCharges(plan), []);
assert.equal((await earned(roman)).earned, before);
// …the trainer can't be booked twice at that time (a lesson right after is fine)…
await denied(lesson('admin', { trainer_id: roman.id, minutes: 45, held_on: '2026-12-01', start_time: '17:30' }, [a.id]), /already has a lesson/);
const next = (await lesson('admin', { trainer_id: roman.id, minutes: 45, held_on: '2026-12-01', start_time: '17:45' }, [a.id])).id;
await denied(as('admin', `update public.lessons set start_time = '17:15' where id = $1`, [next]), /already has a lesson/);
// …confirming it charges the couple half each and the trainer has earned it…
await status(plan, 'done');
assert.deepEqual(await lessonCharges(plan), [125, 125]);
assert.equal((await earned(roman)).earned, before + 250);
await status(plan, 'no_show'); // changing between charged statuses doesn't charge twice
assert.deepEqual(await lessonCharges(plan), [125, 125]);
// …and cancelling takes the charges and the earning away, and frees the time.
await status(plan, 'cancelled');
assert.deepEqual(await lessonCharges(plan), []);
assert.equal((await earned(roman)).earned, before);
await as('admin', `update public.lessons set start_time = '17:15' where id = $1`, [next]);
await denied(status(plan, 'planned'), /already has a lesson/);
await denied(status(next, 'sometime'), /lessons_status_check/);
// A charged lesson that is already paid can't be un-charged.
await denied(status(l1, 'cancelled'), /foreign key/);
for (const who of ['trainer', 'client', 'nobody']) {
  await as(who, 'select public.set_lesson_status($1, $2)', [next, 'done']); // sees no lesson: nothing happens
  assert.deepEqual(await lessonCharges(next), [], `${who} cannot confirm a lesson`);
}

// The weekly table: a group's slot blocks its own trainer at that hour on that weekday, and only then.
const slot = await ins('group_slots', { group_id: kidsBeg.id, weekday: 3, start_time: '18:15', minutes: 45, hall: 'Small Hall', trainer_id: misha.id }); // Wednesdays
await denied(lesson('admin', { trainer_id: misha.id, minutes: 45, held_on: '2026-12-02', start_time: '18:30' }, [a.id]), /has a group class/); // a Wednesday
await lesson('admin', { trainer_id: misha.id, minutes: 45, held_on: '2026-12-03', start_time: '18:30', hall: 'Big Hall' }, [a.id]); // Thursday: free
await lesson('admin', { trainer_id: roman.id, minutes: 45, held_on: '2026-12-02', start_time: '18:30' }, [a.id]); // another trainer: free
assert.equal((await one('admin', `select hall from public.lessons where held_on = '2026-12-03' and trainer_id = $1`, [misha.id])).hall, 'Big Hall');
await denied(as('anon', 'select * from public.group_slots'), /permission denied/);
for (const who of ['trainer', 'client', 'nobody']) {
  assert.equal(await count(who, 'group_slots'), 0);
  await denied(as(who, `insert into public.group_slots (group_id, weekday, start_time, minutes) values ($1, 1, '10:00', 45)`, [kidsBeg.id]), /row-level security/);
}
// One date of a group class can differ from its weekly slot.
const classes = async (d1, d2) =>
  (await as('admin', `select on_date::text, held_on::text, start_time::text, hall, trainer_id, changed, cancelled from public.group_classes_between($1, $2) where slot_id = $3 order by held_on`, [d1, d2, slot.id])).rows;
const usual = { on_date: '2026-12-09', held_on: '2026-12-09', start_time: '18:15:00', hall: 'Small Hall', trainer_id: misha.id, changed: false, cancelled: false };
assert.deepEqual(await classes('2026-12-06', '2026-12-12'), [usual]);
// Another trainer covers that one Wednesday: Misha is free for a lesson then, Roman is not.
const change = await ins('group_slot_changes', { slot_id: slot.id, on_date: '2026-12-09', trainer_id: roman.id });
assert.deepEqual(await classes('2026-12-06', '2026-12-12'), [{ ...usual, trainer_id: roman.id, changed: true }]);
const covered = (await lesson('admin', { trainer_id: misha.id, minutes: 45, held_on: '2026-12-09', start_time: '18:30' }, [a.id])).id;
await denied(lesson('admin', { trainer_id: roman.id, minutes: 45, held_on: '2026-12-09', start_time: '18:30' }, [a.id]), /has a group class/);
await as('admin', 'delete from public.lessons where id = $1', [covered]);
// Moved to Friday at another time and hall: gone from Wednesday, there on Friday; the next week is untouched.
await as('admin', `update public.group_slot_changes set trainer_id = null, new_date = '2026-12-11', start_time = '10:00', hall = 'Big Hall' where id = $1`, [change.id]);
assert.deepEqual(await classes('2026-12-06', '2026-12-12'), [{ ...usual, held_on: '2026-12-11', start_time: '10:00:00', hall: 'Big Hall', changed: true }]);
assert.deepEqual(await classes('2026-12-13', '2026-12-19'), [{ ...usual, on_date: '2026-12-16', held_on: '2026-12-16' }]);
// Cancelled for that date: still listed, flagged, and its trainer is free.
await as('admin', `update public.group_slot_changes set new_date = null, start_time = null, hall = null, cancelled = true where id = $1`, [change.id]);
assert.deepEqual(await classes('2026-12-09', '2026-12-09'), [{ ...usual, changed: true, cancelled: true }]);
await as('admin', 'delete from public.lessons where id = $1', [(await lesson('admin', { trainer_id: misha.id, minutes: 45, held_on: '2026-12-09', start_time: '18:30' }, [a.id])).id]);
// Hall rentals: who is required; staff only.
await denied(ins('rentals', { held_on: '2026-12-10', start_time: '12:00', minutes: 60, who: ' ' }), /check/);
await ins('rentals', { held_on: '2026-12-10', start_time: '12:00', minutes: 60, hall: 'Big Hall', who: 'Wedding rehearsal', price: 250 });
for (const table of ['group_slot_changes', 'rentals']) {
  await denied(as('anon', `select * from public.${table}`), /permission denied/);
  for (const who of ['trainer', 'client', 'nobody']) assert.equal(await count(who, table), 0, `${who} reads nothing from ${table}`);
}
for (const who of ['trainer', 'client', 'nobody']) {
  assert.equal((await as(who, `select * from public.group_classes_between('2026-12-06', '2026-12-12')`)).rows.length, 0);
  await denied(as(who, `insert into public.rentals (held_on, start_time, minutes, who) values ('2026-12-10', '12:00', 60, 'x')`), /row-level security/);
  await denied(as(who, `insert into public.group_slot_changes (slot_id, on_date, cancelled) values ($1, '2026-12-16', true)`, [slot.id]), /row-level security/);
}
await as('admin', 'delete from public.group_slots where id = $1', [slot.id]);

// One-time groups, entries, and money from people who are not clients.
const mc = await ins('events', { title: 'Bachata master class', held_on: '2026-12-05', start_time: '11:00', minutes: 90, hall: 'Big Hall', trainer_id: roman.id, price: 120 });
const entry = (who, e) => one(who, 'select public.add_entry($1::jsonb) id', [JSON.stringify(e)]);
// A client's student: the entry lands on their account, named after the event.
const mine = (await entry('admin', { event_id: mc.id, student_id: a.id, amount: 120 })).id;
assert.deepEqual(await one('admin', `select kind, description, day::text, amount::float from public.charges where entry_id = $1`, [mine]), { kind: 'entry', description: 'Bachata master class', day: '2026-12-05', amount: 120 });
// A guest is only a name: nothing on anyone's account…
const guest = (await entry('admin', { event_id: mc.id, guest_name: 'Dana (guest)', amount: 120 })).id;
assert.equal((await as('admin', 'select 1 from public.charges where entry_id = $1', [guest])).rows.length, 0);
await denied(entry('admin', { event_id: mc.id, amount: 120 }), /entry_by_student_or_guest/);
// …a drop-in to a regular group class works the same way.
const dropIn = (await entry('admin', { group_id: kidsBeg.id, held_on: '2026-12-07', guest_name: 'Noa (guest)', amount: 80 })).id;
// The guest pays without being a client; the payment says who and what for, and gets the next number.
const lastNumber = (await one('admin', 'select max(number)::int n from public.payments')).n;
const guestPay = (p) => one('admin', 'select public.record_payment($1::jsonb, $2::jsonb) id', [JSON.stringify({ method: 'cash', ...p }), '[]']);
const gp = (await guestPay({ payer_name: 'Dana (guest)', what: 'Bachata master class', entry_id: guest, amount: 120 })).id;
assert.deepEqual(await one('admin', 'select client_id, payer_name, what, number::int from public.payments where id = $1', [gp]), { client_id: null, payer_name: 'Dana (guest)', what: 'Bachata master class', number: lastNumber + 1 });
await denied(guestPay({ amount: 50 }), /payer_known/); // neither a client nor a name
// A hall rental is paid the same way; neither touches a family's balance.
const rent = (await one('admin', `select id from public.rentals where who = 'Wedding rehearsal'`)).id;
await guestPay({ payer_name: 'Wedding rehearsal', what: 'Hall rental', rental_id: rent, amount: 250, method: 'bit' });
const familyBefore = await balance();
assert.deepEqual(await balance(), familyBefore);
// Its payer and purpose can't be rewritten afterwards; a paid entry or rental can't be deleted.
await denied(as('admin', `update public.payments set payer_name = 'Someone else' where id = $1`, [gp]), /cannot be changed/);
await denied(as('admin', 'delete from public.entries where id = $1', [guest]), /foreign key/);
await denied(as('admin', 'delete from public.rentals where id = $1', [rent]), /foreign key/);
// An unpaid entry can go, taking its charge with it.
await as('admin', 'delete from public.entries where id in ($1, $2)', [mine, dropIn]);
assert.equal((await as('admin', 'select 1 from public.charges where entry_id = $1', [mine])).rows.length, 0);
for (const table of ['events', 'entries']) {
  await denied(as('anon', `select * from public.${table}`), /permission denied/);
  for (const who of ['trainer', 'client', 'nobody']) assert.equal(await count(who, table), 0, `${who} reads nothing from ${table}`);
}
for (const who of ['trainer', 'client', 'nobody']) {
  await denied(entry(who, { event_id: mc.id, guest_name: 'x', amount: 1 }), /row-level security|null value/);
  await denied(one(who, 'select public.record_payment($1::jsonb, $2::jsonb)', [JSON.stringify({ method: 'cash', payer_name: 'x', amount: 1 }), '[]']), /row-level security/);
}

// Dance partners always point at each other, and changing one side lets the old partner go.
const partnerOf = async (s) => (await one('admin', 'select partner_id from public.students where id = $1', [s.id])).partner_id;
await as('admin', 'update public.students set partner_id = $1 where id = $2', [partner.id, b.id]);
assert.equal(await partnerOf(partner), b.id);
await as('admin', 'update public.students set partner_id = $1 where id = $2', [partner.id, a.id]);
assert.deepEqual([await partnerOf(partner), await partnerOf(b), await partnerOf(a)], [a.id, null, partner.id]);
await as('admin', 'update public.students set partner_id = null where id = $1', [a.id]);
assert.equal(await partnerOf(partner), null);
await denied(as('admin', 'update public.students set partner_id = id where id = $1', [a.id]), /own partner/);

// Payouts bring down what is owed to the trainer; an expense must say what it was for.
await ins('trainer_payouts', { trainer_id: misha.id, amount: 200 });
assert.deepEqual(await earned(misha), { earned: 280, paid: 200, owed: 80 });
await denied(ins('expenses', { amount: 50, comment: ' ' }), /check/);
await ins('expenses', { amount: 50, comment: 'floor wax' });

// Everyone else: nothing.
for (const table of ['trainers', 'trainer_rates', 'lessons', 'lesson_students', 'trainer_payouts', 'expenses', 'trainer_balances']) {
  await denied(as('anon', `select * from public.${table}`), /permission denied/);
  for (const who of ['trainer', 'client', 'nobody']) assert.equal(await count(who, table), 0, `${who} reads nothing from ${table}`);
}
for (const who of ['trainer', 'client', 'nobody']) {
  // They can't even see the rates, so it stops before the insert the rules would refuse.
  await denied(lesson(who, { trainer_id: roman.id, minutes: 45 }, [a.id]), /no price/);
  await denied(lesson(who, { trainer_id: roman.id, minutes: 45, price: 1, trainer_pay: 1 }, [a.id]), /row-level security/);
  await denied(as(who, `insert into public.expenses (amount, comment) values (1, 'x')`), /row-level security/);
  await denied(as(who, 'insert into public.trainer_payouts (trainer_id, amount) values ($1, 1)', [roman.id]), /row-level security/);
}

// ── Public sign-up to a master class: the one thing a visitor may do ─────────
const pub = (fn, args) => as('anon', `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(', ')}) r`, args).then((x) => x.rows[0].r);
const open = await ins('events', { title: 'Open class', held_on: '2027-03-01', start_time: '18:00', minutes: 60, hall: 'Big Hall', trainer_id: roman.id, price: 90, capacity: 2 });
// Switched off (the default): the event doesn't exist for a visitor.
assert.equal(await pub('public_event', [open.id]), null);
const signUp = (id, form) => pub('public_signup', [id, JSON.stringify(form)]);
assert.equal(await signUp(open.id, { name_en: 'Dana Levi', phone: '054-111-2222' }), 'closed');
await as('admin', 'update public.events set public_signup = true where id = $1', [open.id]);
// Switched on: its public details, and nothing about who is coming.
assert.deepEqual(await pub('public_event', [open.id]), { title: 'Open class', held_on: '2027-03-01', start_time: '18:00:00', minutes: 60, hall: 'Big Hall', price: 90, trainer: 'Roman', state: 'open' });
// A sign-up needs at least one real-looking name and a phone; what else is given must look right.
for (const form of [
  { phone: '054-111-2222', id_number: '123456782' }, // no name in any language
  { name_en: 'Dana Levi', phone: '054-111-2222' }, // no ID number
  { name_en: 'Dana Levi', phone: '054-111-2222', id_number: '123' }, // too short to be one
  { name_en: 'D', phone: '054-111-2222', id_number: '123456782' },
  { name_en: 'Dana Levi', phone: '12345', id_number: '123456782' },
  { name_en: 'Dana Levi', name_he: 'x'.repeat(81), phone: '054-111-2222', id_number: '123456782' },
  { name_en: 'Dana Levi', phone: '054-111-2222', id_number: '123456782', email: 'not-an-email' },
  { name_en: 'Dana Levi', phone: '054-111-2222', id_number: '<script>' },
  { name_en: 'Dana Levi', phone: '054-111-2222', id_number: '123456782', comment: 'x'.repeat(501) },
]) assert.equal(await signUp(open.id, form), 'invalid');
// Names in more than one language are all kept; the entry is an unpaid guest at the event's price.
assert.equal(await signUp(open.id, { name_he: ' דנה  לוי ', name_en: 'Dana Levi', phone: '054-111-2222', email: ' Dana@Example.com ', id_number: '123456782', comment: 'First time' }), 'ok');
assert.deepEqual(await one('admin', 'select guest_name, phone, amount::float, online, student_id, details from public.entries where event_id = $1', [open.id]), {
  guest_name: 'דנה לוי / Dana Levi', phone: '054-111-2222', amount: 90, online: true, student_id: null,
  details: { name_he: 'דנה לוי', name_en: 'Dana Levi', email: 'dana@example.com', id_number: '123456782', comment: 'First time' },
});
// The same phone again is recognised, however it is typed; a name, the phone and the ID are enough; then the class fills up.
assert.equal(await signUp(open.id, { name_ru: 'Дана', phone: '0541112222', id_number: '987654321' }), 'already');
assert.equal(await signUp(open.id, { name_ru: 'Ноа Бар', phone: '052-333-4444', id_number: 'A1234567' }), 'ok');
assert.equal(await signUp(open.id, { name_en: 'Late Comer', phone: '050-555-6666', id_number: '555555555' }), 'full');
assert.equal((await pub('public_event', [open.id])).state, 'full');
// A class that has passed is closed.
const gone = await ins('events', { title: 'Old class', held_on: '2026-01-10', start_time: '18:00', minutes: 60, price: 90, public_signup: true });
assert.equal(await signUp(gone.id, { name_en: 'Dana Levi', phone: '054-111-2222' }), 'closed');
assert.equal((await pub('public_event', [gone.id])).state, 'closed');
// And that is all a visitor can do: still no table, no other function.
for (const table of ['events', 'entries', 'clients', 'students']) await denied(as('anon', `select * from public.${table}`), /permission denied/);
await denied(as('anon', `select public.add_entry('{}'::jsonb)`), /permission denied|row-level security|null value/);
await as('admin', 'delete from public.events where id in ($1, $2)', [open.id, gone.id]);

// ── Stage 3b: a trainer in their own app ─────────────────────────────────────
// The "trainer" login is linked to Misha. Everything goes through functions; the tables stay shut.
await as('admin', 'update public.trainers set user_id = $1 where id = $2', [U.trainer, misha.id]);
const rpc = (who, fn, args = []) => as(who, `select * from public.${fn}(${args.map((_, i) => `$${i + 1}`).join(', ')})`, args);
const mineIn = async (d1, d2) => (await rpc('trainer', 'trainer_lessons', [d1, d2])).rows;
// Sees their own lessons with the students' names — and nobody else's.
const all = await mineIn('2026-01-01', '2027-12-31');
assert.ok(all.length > 0 && all.every((l) => typeof l.students === 'string'));
assert.equal(all.length, (await one('admin', 'select count(*)::int n from public.lessons where trainer_id = $1', [misha.id])).n);
for (const who of ['client', 'nobody']) {
  assert.equal((await rpc(who, 'trainer_lessons', ['2026-01-01', '2027-12-31'])).rows.length, 0);
  assert.equal((await rpc(who, 'trainer_students')).rows.length, 0);
  assert.equal((await rpc(who, 'trainer_summary')).rows[0].trainer_summary, null);
  await denied(rpc(who, 'trainer_request_lesson', [JSON.stringify({ minutes: 45, held_on: '2027-06-01', start_time: '10:00' }), [a.id]]), /not linked to a trainer/);
}
await denied(as('anon', 'select * from public.trainer_students()'), /permission denied/);
for (const table of ['lessons', 'students', 'lesson_requests', 'trainer_rates']) assert.equal(await count('trainer', table), 0, `the trainer still reads no table: ${table}`);
// Names only, to choose from; and their own lesson lengths.
assert.deepEqual(Object.keys((await rpc('trainer', 'trainer_students')).rows[0]).sort(), ['full_name', 'id', 'partner_id']);
assert.deepEqual((await rpc('trainer', 'trainer_rates_mine')).rows.map((r) => r.minutes), [45, 60]);

// Asking for a lesson: it is theirs whatever they send, at their own rate, and waits for the admin.
const asked = (await rpc('trainer', 'trainer_request_lesson', [JSON.stringify({ trainer_id: roman.id, price: 1, trainer_pay: 9999, status: 'done', minutes: 45, held_on: '2027-06-01', start_time: '10:00' }), [a.id]])).rows[0].trainer_request_lesson;
assert.deepEqual(await one('admin', 'select trainer_id, status, price::float, trainer_pay::float from public.lessons where id = $1', [asked]), { trainer_id: misha.id, status: 'requested', price: 150, trainer_pay: 100 });
assert.equal((await as('admin', 'select 1 from public.charges where lesson_id = $1', [asked])).rows.length, 0);
// They can take it back while it waits; once the admin has approved it, only by asking.
const second = (await rpc('trainer', 'trainer_request_lesson', [JSON.stringify({ minutes: 45, held_on: '2027-06-02', start_time: '10:00' }), [a.id]])).rows[0].trainer_request_lesson;
await rpc('trainer', 'trainer_withdraw', [second]);
await as('admin', 'select public.set_lesson_status($1, $2)', [asked, 'planned']);
await denied(rpc('trainer', 'trainer_withdraw', [asked]), /still waiting/);
// A move goes to the admin; approving it moves the lesson, and the request is closed.
const moveReq = (await rpc('trainer', 'trainer_request_change', [asked, 'move', '2027-06-03', '11:30', 'student asked'])).rows[0].trainer_request_change;
assert.equal((await mineIn('2027-06-01', '2027-06-01'))[0].request.kind, 'move');
await as('admin', 'select public.decide_lesson_request($1, true)', [moveReq]);
assert.deepEqual(await one('admin', 'select held_on::text, start_time::text from public.lessons where id = $1', [asked]), { held_on: '2027-06-03', start_time: '11:30:00' });
await denied(as('admin', 'select public.decide_lesson_request($1, true)', [moveReq]), /not waiting/);
// A rejected cancellation changes nothing; an approved one cancels.
const no = (await rpc('trainer', 'trainer_request_change', [asked, 'cancel', null, null, ''])).rows[0].trainer_request_change;
await as('admin', 'select public.decide_lesson_request($1, false)', [no]);
assert.equal((await one('admin', 'select status from public.lessons where id = $1', [asked])).status, 'planned');
await denied(rpc('trainer', 'trainer_request_change', [asked, 'move', null, null, '']), /move_needs_when/);
// Not someone else's lesson, in any way.
const romans = (await one('admin', `select id from public.lessons where trainer_id = $1 and status = 'planned' limit 1`, [roman.id])).id;
await denied(rpc('trainer', 'trainer_request_change', [romans, 'cancel', null, null, '']), /only your own/);
await denied(rpc('trainer', 'trainer_confirm', [romans, 'done']), /only your own/);
await denied(rpc('trainer', 'trainer_withdraw', [romans]), /only your own/);
// Confirming: not before its day; after it, the student is charged and the trainer has earned it.
await denied(rpc('trainer', 'trainer_confirm', [asked, 'done']), /on its day or after/);
const past = (await lesson('admin', { trainer_id: misha.id, minutes: 45, held_on: '2026-11-02', start_time: '09:00' }, [a.id])).id;
const earnedBefore = (await rpc('trainer', 'trainer_summary')).rows[0].trainer_summary.earned;
await denied(rpc('trainer', 'trainer_confirm', [past, 'cancelled']), /unknown outcome/);
await rpc('trainer', 'trainer_confirm', [past, 'done']);
assert.equal((await one('admin', 'select amount::float from public.charges where lesson_id = $1', [past])).amount, 150);
const summary = (await rpc('trainer', 'trainer_summary')).rows[0].trainer_summary;
assert.deepEqual([summary.name, summary.earned - earnedBefore, summary.payouts.length], ['Misha', 100, 1]);
await denied(rpc('trainer', 'trainer_confirm', [past, 'no_show']), /only your own planned/); // already confirmed
// A trainer whose role is taken away is nobody again.
await as('admin', `update public.profiles set roles = '{}' where id = $1`, [U.trainer]);
assert.equal((await mineIn('2026-01-01', '2027-12-31')).length, 0);
await denied(rpc('trainer', 'trainer_confirm', [asked, 'done']), /only your own/);

console.log('access rules: all checks passed');
