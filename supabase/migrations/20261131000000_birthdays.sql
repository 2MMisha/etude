-- Birthdays from the students in the CRM (owner, 2026-11-14), instead of the
-- list typed in /admin/. The students' app shows today's and the coming week's
-- to a family signed in to its account (and let in by the studio): first name
-- only, in Hebrew and in English, with day and month - never the year.
-- A morning push ("It's a birthday today!") goes to every phone with the app,
-- sent by the database itself (pg_cron + pg_net, the OneSignal key in Vault, as
-- for lesson pushes); without them it is only logged. ASCII only.

create function public.school_birthdays() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'he', split_part(btrim(s.full_name), ' ', 1),
      'en', split_part(btrim(s.full_name_en), ' ', 1),
      'day', extract(day from s.birth_date)::int,
      'month', extract(month from s.birth_date)::int)
    order by extract(month from s.birth_date), extract(day from s.birth_date)), '[]')
  from public.students s
  join public.clients c on c.id = s.client_id
  where s.birth_date is not null and not s.archived and not c.archived and c.approved
    and (public.family_approved() or public.is_staff());
$$;
revoke all on function public.school_birthdays() from public, anon;
grant execute on function public.school_birthdays() to authenticated;

-- One push to everyone with the app, through OneSignal (logged in push_log with no user ids).
create function public.push_everyone(title jsonb, body jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  rest_key text;
  sent boolean := false;
  why text := '';
begin
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
            'included_segments', jsonb_build_array('Total Subscriptions'),
            'headings', title, 'contents', body,
            'url', 'https://etude.ristar.co/student/#home'),
          jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Key ' || rest_key);
        sent := true;
      end if;
    else
      why := 'no pg_net or vault';
    end if;
  exception when others then
    why := sqlerrm;
  end;
  insert into public.push_log (user_ids, lang, title, body, sent, note)
  values ('{}', 'all', title ->> 'en', body ->> 'en', sent, why);
end $$;
revoke all on function public.push_everyone(jsonb, jsonb) from public, anon, authenticated;

-- Today's birthdays, in the morning. Names in Hebrew for Hebrew phones,
-- in English (or Hebrew when there is no English name) for the others.
create function public.birthday_push() returns void
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Jerusalem')::date;
  he text;
  en text;
begin
  select string_agg(split_part(btrim(s.full_name), ' ', 1), ', '),
         string_agg(coalesce(nullif(split_part(btrim(s.full_name_en), ' ', 1), ''), split_part(btrim(s.full_name), ' ', 1)), ', ')
    into he, en
  from public.students s join public.clients c on c.id = s.client_id
  where s.birth_date is not null and not s.archived and not c.archived and c.approved
    and extract(day from s.birth_date) = extract(day from today) and extract(month from s.birth_date) = extract(month from today);
  if he is null then return; end if;
  perform public.push_everyone(
    jsonb_build_object('he', U&'\05D4\05D9\05D5\05DD \05D9\05D5\05DD \05D4\05D5\05DC\05D3\05EA!', 'ru', U&'\0421\0435\0433\043E\0434\043D\044F \0434\0435\043D\044C \0440\043E\0436\0434\0435\043D\0438\044F!', 'en', 'It''s a birthday today!'),
    jsonb_build_object('he', U&'\05DE\05D6\05DC \05D8\05D5\05D1 \05DC' || he || '! ' || U&'\+01F389', 'ru', U&'\041F\043E\0437\0434\0440\0430\0432\043B\044F\0435\043C: ' || en || '! ' || U&'\+01F389', 'en', 'Happy birthday, ' || en || '! ' || U&'\+01F389'));
end $$;
revoke all on function public.birthday_push() from public, anon, authenticated;

-- Every morning at 06:15 UTC (08:15 / 09:15 in Israel), where pg_cron exists.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('etude-birthdays', '15 6 * * *', 'select public.birthday_push()');
  end if;
end $$;
