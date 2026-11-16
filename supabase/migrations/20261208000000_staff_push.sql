-- Staff send their own notifications from the CRM (owner, 2026-11-16): to one
-- family from its page, or to the families a filtered Clients list shows (all
-- who owe, a group, those to contact...). The message goes to the phones of
-- each family's login, like the automatic ones, and is kept in push_log.
--   push_users(users, lang, title, body, url)  the one place that talks to OneSignal
--   staff_push(client_ids, title, body)         staff only; returns how many families it reached
-- push_families (automatic messages) now sends through push_users too.
-- A family with no app login, not let in, or archived is skipped. ASCII only.

create function public.push_users(users uuid[], lang text, title text, body text, url text default 'https://etude.ristar.co/student/#home') returns void
language plpgsql security definer set search_path = '' as $$
declare
  rest_key text;
  sent boolean := false;
  why text := '';
begin
  if coalesce(array_length(users, 1), 0) = 0 then return; end if;
  begin
    if to_regclass('vault.decrypted_secrets') is not null
       and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'net' and p.proname = 'http_post') then
      execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into rest_key using 'onesignal_rest_key';
      if rest_key is null then
        why := 'no key in vault';
      else
        execute 'select net.http_post(url := $1, body := $2, headers := $3)'
        using 'https://api.onesignal.com/notifications?c=push',
          jsonb_build_object(
            'app_id', '064969bd-2602-4775-b49a-7b60231111d5',
            'target_channel', 'push',
            'include_aliases', jsonb_build_object('external_id', to_jsonb(users)),
            'headings', jsonb_build_object('en', title),
            'contents', jsonb_build_object('en', body),
            'url', url),
          jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Key ' || rest_key);
        sent := true;
      end if;
    else
      why := 'no pg_net or vault';
    end if;
  exception when others then
    why := sqlerrm;
  end;
  insert into public.push_log (user_ids, lang, title, body, sent, note) values (users, lang, title, body, sent, why);
end $$;
revoke all on function public.push_users(uuid[], text, text, text, text) from public, anon, authenticated;

create or replace function public.push_families(student_ids uuid[], msg jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare g record;
begin
  for g in
    select c.lang, array_agg(distinct c.user_id) as users
    from public.students s join public.clients c on c.id = s.client_id
    where s.id = any (student_ids) and c.user_id is not null and c.approved and not c.archived
    group by c.lang
  loop
    perform public.push_users(g.users, g.lang, msg -> g.lang ->> 0, msg -> g.lang ->> 1, 'https://etude.ristar.co/student/#schedule');
  end loop;
end $$;

create function public.staff_push(client_ids uuid[], title text, body text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  g record;
  n int := 0;
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  if length(btrim(coalesce(title, ''))) = 0 or length(btrim(coalesce(body, ''))) = 0 then raise exception 'a title and a text are needed'; end if;
  if length(title) > 100 or length(body) > 1000 then raise exception 'the message is too long'; end if;
  for g in
    select c.lang, array_agg(c.user_id) as users
    from public.clients c
    where c.id = any (client_ids) and c.user_id is not null and c.approved and not c.archived
    group by c.lang
  loop
    perform public.push_users(g.users, g.lang, btrim(title), btrim(body));
    n := n + array_length(g.users, 1);
  end loop;
  return n;
end $$;
revoke all on function public.staff_push(uuid[], text, text) from public, anon;
grant execute on function public.staff_push(uuid[], text, text) to authenticated;
