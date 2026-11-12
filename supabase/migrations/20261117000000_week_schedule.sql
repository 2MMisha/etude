-- The weekly schedule table: group classes get their weekly slots (day, time,
-- hall, trainer), private lessons get a hall, and a trainer can't be given a
-- private lesson on top of their own group class.
-- Several lessons may share a hall at the same time (that is how the studio
-- works), so halls are shown, not policed. ASCII only.

insert into public.settings (id, value) values ('halls', '["Big Hall", "Small Hall"]') on conflict (id) do nothing;

alter table public.lessons add column hall text not null default '';

-- When a group meets every week. weekday: 0 = Sunday ... 6 = Saturday.
create table public.group_slots (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  minutes int not null check (minutes > 0),
  hall text not null default '',
  trainer_id uuid references public.trainers (id) on delete set null
);

alter table public.group_slots enable row level security;
revoke all on public.group_slots from anon, authenticated;
grant select, insert, update, delete on public.group_slots to authenticated;
create policy "staff only" on public.group_slots for all to authenticated using (public.is_staff()) with check (public.is_staff());
create trigger log_change after insert or update or delete on public.group_slots
  for each row execute function public.log_change();

-- A trainer can't give two things at once: neither two private lessons, nor a
-- private lesson during their own group class.
create or replace function public.lessons_no_overlap() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'cancelled' or new.start_time is null then
    return new;
  end if;
  if exists (
    select 1 from public.lessons x
    where x.id <> new.id and x.trainer_id = new.trainer_id and x.held_on = new.held_on
      and x.status <> 'cancelled' and x.start_time is not null
      and x.start_time < new.start_time + make_interval(mins => new.minutes)
      and new.start_time < x.start_time + make_interval(mins => x.minutes)
  ) then
    raise exception 'the trainer already has a lesson at that time';
  end if;
  if exists (
    select 1 from public.group_slots g join public.groups gr on gr.id = g.group_id
    where not gr.archived and g.trainer_id = new.trainer_id and g.weekday = extract(dow from new.held_on)::int
      and g.start_time < new.start_time + make_interval(mins => new.minutes)
      and new.start_time < g.start_time + make_interval(mins => g.minutes)
  ) then
    raise exception 'the trainer has a group class at that time';
  end if;
  return new;
end $$;

-- record_lesson again, now taking the hall too.
-- l = {trainer_id, held_on, start_time, minutes, hall, status, price, trainer_pay, note}
create or replace function public.record_lesson(l jsonb, student_ids uuid[]) returns uuid
language plpgsql set search_path = '' as $$
declare
  lid uuid;
  n int := coalesce(array_length(student_ids, 1), 0);
  r public.trainer_rates;
  total numeric;
  pay numeric;
  mins int := (l ->> 'minutes')::int;
  st text := coalesce(nullif(l ->> 'status', ''), 'planned');
begin
  if n < 1 or n > 4 then
    raise exception 'a private lesson has one to four students';
  end if;
  select * into r from public.trainer_rates where trainer_id = (l ->> 'trainer_id')::uuid and minutes = mins;
  total := coalesce(nullif(l ->> 'price', '')::numeric, r.price);
  if total is null then
    raise exception 'no price for this trainer and length';
  end if;
  pay := coalesce(
    nullif(l ->> 'trainer_pay', '')::numeric,
    case r.pay_kind when 'fixed' then r.pay_value when 'percent' then round(total * r.pay_value / 100, 2) end
  );
  if pay is null then
    raise exception 'no pay rate for this trainer and length';
  end if;

  insert into public.lessons (trainer_id, held_on, start_time, minutes, hall, status, price, trainer_pay, note)
  values (
    (l ->> 'trainer_id')::uuid, coalesce(nullif(l ->> 'held_on', '')::date, current_date), nullif(l ->> 'start_time', '')::time,
    mins, coalesce(l ->> 'hall', ''), st, total, pay, coalesce(l ->> 'note', '')
  )
  returning id into lid;
  insert into public.lesson_students (lesson_id, student_id) select lid, s from unnest(student_ids) s;
  if st in ('done', 'no_show', 'late_cancel') then
    perform public.lesson_put_charges(lid);
  end if;
  return lid;
end $$;
