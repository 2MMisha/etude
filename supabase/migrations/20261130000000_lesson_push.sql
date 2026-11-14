-- Personal push notifications from the CRM (owner, 2026-11-14): a family hears
-- on its phone when one of its private lessons is added, moved, given another
-- trainer, cancelled or removed, and when a group class of its students is
-- cancelled or moved for a date (or put back). Only future lessons and classes.
--
-- Who gets it: the family's login (clients.user_id), for a family the studio
-- let in. The students' app tells OneSignal which login a phone belongs to
-- (OneSignal.login), so the push goes to that family's phones only. The text
-- is in the family's language (clients.lang).
--
-- Sending: every message is written to push_log first (staff can read it).
-- It goes out through pg_net with the OneSignal REST key kept in Supabase
-- Vault under the name 'onesignal_rest_key' - the owner stores it once with
--   select vault.create_secret('<the key>', 'onesignal_rest_key');
-- Without the key (or pg_net), messages are only logged. A failure to send
-- never stops the change in the CRM. ASCII only; non-ASCII text uses U&'' escapes.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

create table public.push_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_ids uuid[] not null,
  lang text not null,
  title text not null,
  body text not null,
  sent boolean not null default false,
  note text not null default ''
);
alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;
grant select on public.push_log to authenticated;
create policy "staff read" on public.push_log for select to authenticated using (public.is_staff());

-- Send one message, in each family's language, to the families of these students.
-- msg = {he: [title, body], ru: [...], en: [...]}
create function public.push_families(student_ids uuid[], msg jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  g record;
  rest_key text;
  sent boolean;
  why text;
begin
  for g in
    select c.lang, array_agg(distinct c.user_id) as users
    from public.students s join public.clients c on c.id = s.client_id
    where s.id = any (student_ids) and c.user_id is not null and c.approved and not c.archived
    group by c.lang
  loop
    sent := false;
    why := '';
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
              'include_aliases', jsonb_build_object('external_id', to_jsonb(g.users)),
              'headings', jsonb_build_object('en', msg -> g.lang ->> 0),
              'contents', jsonb_build_object('en', msg -> g.lang ->> 1),
              'url', 'https://etude.ristar.co/student/#schedule'),
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
    values (g.users, g.lang, msg -> g.lang ->> 0, msg -> g.lang ->> 1, sent, why);
  end loop;
end $$;
revoke all on function public.push_families(uuid[], jsonb) from public, anon, authenticated;

-- Texts. %1 = when (dd.mm hh:mi), %2 = trainer or group, %3 = the new time.
create function public.lesson_msg(kind text, whn text, who text, newer text default '') returns jsonb
language sql immutable set search_path = '' as $$
  select case kind
    when 'added' then jsonb_build_object(
      'he', jsonb_build_array(U&'\05E9\05D9\05E2\05D5\05E8 \05E4\05E8\05D8\05D9 \05D7\05D3\05E9', whn || ', ' || who),
      'ru', jsonb_build_array(U&'\041D\043E\0432\044B\0439 \0447\0430\0441\0442\043D\044B\0439 \0443\0440\043E\043A', whn || ', ' || who),
      'en', jsonb_build_array('New private lesson', whn || ', ' || who))
    when 'moved' then jsonb_build_object(
      'he', jsonb_build_array(U&'\05D4\05E9\05D9\05E2\05D5\05E8 \05D4\05E4\05E8\05D8\05D9 \05D4\05D5\05D6\05D6', whn || ' > ' || newer || ', ' || who),
      'ru', jsonb_build_array(U&'\0427\0430\0441\0442\043D\044B\0439 \0443\0440\043E\043A \043F\0435\0440\0435\043D\0435\0441\0451\043D', whn || ' > ' || newer || ', ' || who),
      'en', jsonb_build_array('Private lesson moved', whn || ' > ' || newer || ', ' || who))
    when 'trainer' then jsonb_build_object(
      'he', jsonb_build_array(U&'\05DE\05D0\05DE\05DF/\05EA \05D0\05D7\05E8/\05EA \05DC\05E9\05D9\05E2\05D5\05E8 \05D4\05E4\05E8\05D8\05D9', whn || ', ' || who),
      'ru', jsonb_build_array(U&'\0414\0440\0443\0433\043E\0439 \0442\0440\0435\043D\0435\0440 \043D\0430 \0447\0430\0441\0442\043D\043E\043C \0443\0440\043E\043A\0435', whn || ', ' || who),
      'en', jsonb_build_array('Another trainer for your private lesson', whn || ', ' || who))
    when 'cancelled' then jsonb_build_object(
      'he', jsonb_build_array(U&'\05D4\05E9\05D9\05E2\05D5\05E8 \05D4\05E4\05E8\05D8\05D9 \05D1\05D5\05D8\05DC', whn || ', ' || who),
      'ru', jsonb_build_array(U&'\0427\0430\0441\0442\043D\044B\0439 \0443\0440\043E\043A \043E\0442\043C\0435\043D\0451\043D', whn || ', ' || who),
      'en', jsonb_build_array('Private lesson cancelled', whn || ', ' || who))
    when 'class_cancelled' then jsonb_build_object(
      'he', jsonb_build_array(U&'\05D4\05E9\05D9\05E2\05D5\05E8 \05D1\05D5\05D8\05DC', who || ', ' || whn),
      'ru', jsonb_build_array(U&'\0417\0430\043D\044F\0442\0438\0435 \043E\0442\043C\0435\043D\0435\043D\043E', who || ', ' || whn),
      'en', jsonb_build_array('Class cancelled', who || ', ' || whn))
    when 'class_moved' then jsonb_build_object(
      'he', jsonb_build_array(U&'\05D4\05E9\05D9\05E2\05D5\05E8 \05D4\05D5\05D6\05D6', who || ', ' || whn || ' > ' || newer),
      'ru', jsonb_build_array(U&'\0417\0430\043D\044F\0442\0438\0435 \043F\0435\0440\0435\043D\0435\0441\0435\043D\043E', who || ', ' || whn || ' > ' || newer),
      'en', jsonb_build_array('Class moved', who || ', ' || whn || ' > ' || newer))
    when 'class_back' then jsonb_build_object(
      'he', jsonb_build_array(U&'\05D4\05E9\05D9\05E2\05D5\05E8 \05DB\05E8\05D2\05D9\05DC', who || ', ' || whn),
      'ru', jsonb_build_array(U&'\0417\0430\043D\044F\0442\0438\0435 \0441\043D\043E\0432\0430 \043F\043E \0440\0430\0441\043F\0438\0441\0430\043D\0438\044E', who || ', ' || whn),
      'en', jsonb_build_array('Class back to its usual time', who || ', ' || whn))
  end;
$$;

create function public.when_text(d date, t time) returns text
language sql immutable set search_path = '' as $$
  select to_char(d, 'DD.MM') || coalesce(' ' || to_char(t, 'HH24:MI'), '');
$$;

create function public.is_ahead(d date) returns boolean
language sql stable set search_path = '' as $$
  select d >= (now() at time zone 'Asia/Jerusalem')::date;
$$;

-- Private lessons.
create function public.lesson_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  kids uuid[];
  coach text;
  live text[] := array['planned'];
begin
  if tg_op = 'DELETE' then
    if old.status = any (live) and public.is_ahead(old.held_on) then
      select array_agg(student_id) into kids from public.lesson_students where lesson_id = old.id;
      select full_name into coach from public.trainers where id = old.trainer_id;
      perform public.push_families(kids, public.lesson_msg('cancelled', public.when_text(old.held_on, old.start_time), coach));
    end if;
    return old;
  end if;
  -- UPDATE
  if not (public.is_ahead(new.held_on) or public.is_ahead(old.held_on)) then return new; end if;
  select array_agg(student_id) into kids from public.lesson_students where lesson_id = new.id;
  select full_name into coach from public.trainers where id = new.trainer_id;
  if old.status = 'requested' and new.status = 'planned' then
    perform public.push_families(kids, public.lesson_msg('added', public.when_text(new.held_on, new.start_time), coach));
  elsif new.status in ('cancelled', 'late_cancel') and old.status = 'planned' then
    perform public.push_families(kids, public.lesson_msg('cancelled', public.when_text(new.held_on, new.start_time), coach));
  elsif new.status = 'planned' and (new.held_on, new.start_time) is distinct from (old.held_on, old.start_time) then
    perform public.push_families(kids, public.lesson_msg('moved', public.when_text(old.held_on, old.start_time), coach, public.when_text(new.held_on, new.start_time)));
  elsif new.status = 'planned' and new.trainer_id is distinct from old.trainer_id then
    perform public.push_families(kids, public.lesson_msg('trainer', public.when_text(new.held_on, new.start_time), coach));
  end if;
  return new;
end $$;
create trigger lesson_push before delete on public.lessons for each row execute function public.lesson_push();
create trigger lesson_push_update after update on public.lessons for each row execute function public.lesson_push();

-- A student added to or taken off a planned lesson (a new lesson arrives this way too).
create function public.lesson_student_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  l public.lessons;
  coach text;
begin
  select * into l from public.lessons where id = coalesce(new.lesson_id, old.lesson_id);
  if l.id is null or l.status <> 'planned' or not public.is_ahead(l.held_on) then return null; end if; -- gone with its lesson, or not a planned one
  select full_name into coach from public.trainers where id = l.trainer_id;
  perform public.push_families(array[coalesce(new.student_id, old.student_id)],
    public.lesson_msg(case tg_op when 'INSERT' then 'added' else 'cancelled' end, public.when_text(l.held_on, l.start_time), coach));
  return null;
end $$;
create trigger lesson_student_push after insert or delete on public.lesson_students for each row execute function public.lesson_student_push();

-- Group classes changed for one date.
create function public.class_change_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r public.group_slot_changes := coalesce(new, old);
  s public.group_slots;
  grp text;
  kids uuid[];
  kind text;
begin
  if not public.is_ahead(r.on_date) then return null; end if;
  select * into s from public.group_slots where id = r.slot_id;
  select name into grp from public.groups where id = s.group_id;
  select array_agg(e.student_id) into kids from public.enrollments e where e.group_id = s.group_id;
  if kids is null then return null; end if;
  kind := case
    when tg_op = 'DELETE' then 'class_back'
    when new.cancelled then 'class_cancelled'
    when new.new_date is not null or new.start_time is not null then 'class_moved'
    else null end;
  if kind is null or (tg_op = 'UPDATE' and (new.cancelled, new.new_date, new.start_time) is not distinct from (old.cancelled, old.new_date, old.start_time)) then
    return null; -- only the hall or the trainer changed: no need to wake anyone
  end if;
  perform public.push_families(kids, public.lesson_msg(kind, public.when_text(r.on_date, s.start_time), grp,
    public.when_text(coalesce(r.new_date, r.on_date), coalesce(r.start_time, s.start_time))));
  return null;
end $$;
create trigger class_change_push after insert or update or delete on public.group_slot_changes for each row execute function public.class_change_push();
