// Security review helper (stage 8): builds the database from the migrations in
// PGlite and prints what each kind of caller can reach — tables with their
// row-level security and grants, views, and every function anon or a signed-in
// login may execute (security definer or not). Run: node supabase/tests/schema-map.mjs
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';

const db = new PGlite();
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

const q = async (sql) => (await db.query(sql)).rows;
console.log('== Tables: RLS, grants to anon / authenticated, policies');
for (const t of await q(`select c.relname, c.relrowsecurity rls, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v') order by c.relkind, c.relname`)) {
  const g = await q(`select grantee, string_agg(privilege_type, ',' order by privilege_type) p from information_schema.role_table_grants
    where table_schema = 'public' and table_name = '${t.relname}' and grantee in ('anon', 'authenticated', 'PUBLIC') group by grantee`);
  const pol = await q(`select polname, polcmd, pg_get_expr(polqual, polrelid) q, pg_get_expr(polwithcheck, polrelid) w, array(select rolname from pg_roles where oid = any(polroles)) roles
    from pg_policy where polrelid = 'public.${t.relname}'::regclass`);
  console.log(`${t.relkind === 'v' ? 'VIEW ' : ''}${t.relname}  rls=${t.rls}  grants=${g.map((x) => `${x.grantee}:${x.p}`).join(' ') || '-'}`);
  for (const p of pol) console.log(`    policy ${p.polname} [${p.polcmd}] ${p.roles.join(',')} using(${p.q ?? ''}) check(${p.w ?? ''})`);
}
console.log('\n== Functions executable by anon or authenticated');
for (const f of await q(`select p.proname, pg_get_function_identity_arguments(p.oid) args, p.prosecdef def,
      has_function_privilege('anon', p.oid, 'execute') anon, has_function_privilege('authenticated', p.oid, 'execute') auth,
      coalesce(array_to_string(p.proconfig, ','), '') cfg
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f' order by p.proname`)) {
  if (!f.anon && !f.auth) continue;
  console.log(`${f.anon ? 'ANON ' : '     '}${f.def ? 'DEFINER ' : 'invoker '}${f.proname}(${f.args}) ${f.cfg.includes('search_path') ? '' : '  !! no search_path'}`);
}
console.log('\n== Storage (not built here): check bucket policies in the dashboard');
