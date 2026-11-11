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

console.log('access rules: all checks passed');
