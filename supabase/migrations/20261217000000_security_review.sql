-- Stage 8, security review (2026-11-20). Defence in depth, no behaviour change
-- for staff, trainers or families:
--   * A visitor without a login (the anon role) may run only what the public
--     pages need: site_timetable (the site build), public_event and
--     public_signup (/signup/), student_by_token, submit_student_form and
--     public_docs (a student's form link). Postgres lets everyone run every
--     function unless told otherwise; the rest refused anyway (they check the
--     caller or rely on table rules), now they are not reachable at all.
--     Signed-in logins keep exactly what they could run before.
--   * public_timetable() is removed: nothing uses it since the app shows each
--     family its own schedule.
-- ASCII only.

drop function if exists public.public_timetable(date, date);

do $$
declare f record;
begin
  for f in
    select p.oid, p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    -- Keep what signed-in logins (and the service role) can run today, stated outright...
    if has_function_privilege('authenticated', f.oid, 'execute') then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', f.sig);
    end if;
    -- ...then take it away from everyone else.
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end $$;

grant execute on function
  public.site_timetable(date, date),
  public.public_event(uuid),
  public.public_signup(uuid, jsonb),
  public.student_by_token(uuid),
  public.submit_student_form(uuid, text, jsonb, text),
  public.public_docs()
to anon;
