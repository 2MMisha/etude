-- A notification to several families is written in three languages and each
-- family gets it in its own (owner, 2026-11-17).
--   staff_push_many(client_ids, msg)  msg = {he: [title, text], ru: [...], en: [...]};
--   a language left empty falls back to Hebrew, then Russian, then English.
-- Staff only; families without an app login, not let in, or archived are skipped.
-- ASCII only.

create function public.staff_push_many(client_ids uuid[], msg jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare
  g record;
  n int := 0;
  pick jsonb;
  fallback jsonb;
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  select m into fallback from (
    select msg -> 'he' as m, 1 as o union all select msg -> 'ru', 2 union all select msg -> 'en', 3
  ) x where length(btrim(coalesce(m ->> 0, ''))) > 0 and length(btrim(coalesce(m ->> 1, ''))) > 0 order by o limit 1;
  if fallback is null then raise exception 'a title and a text are needed in at least one language'; end if;
  for g in
    select c.lang, array_agg(c.user_id) as users
    from public.clients c
    where c.id = any (client_ids) and c.user_id is not null and c.approved and not c.archived
    group by c.lang
  loop
    pick := case when length(btrim(coalesce(msg -> g.lang ->> 0, ''))) > 0 and length(btrim(coalesce(msg -> g.lang ->> 1, ''))) > 0
                 then msg -> g.lang else fallback end;
    if length(pick ->> 0) > 100 or length(pick ->> 1) > 1000 then raise exception 'the message is too long'; end if;
    perform public.push_users(g.users, g.lang, btrim(pick ->> 0), btrim(pick ->> 1));
    n := n + array_length(g.users, 1);
  end loop;
  return n;
end $$;
revoke all on function public.staff_push_many(uuid[], jsonb) from public, anon;
grant execute on function public.staff_push_many(uuid[], jsonb) to authenticated;
