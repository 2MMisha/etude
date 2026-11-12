-- The weekly table becomes editable beyond private lessons: a group class can
-- be changed for one date only (moved, another hall or trainer, cancelled)
-- while its weekly slot stays as it is, and hall rentals get their own entries.
-- ASCII only.

-- A change to one occurrence of a group class. Empty fields mean "as usual".
create table public.group_slot_changes (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.group_slots (id) on delete cascade,
  on_date date not null, -- the day the class would normally be
  cancelled boolean not null default false,
  new_date date,
  start_time time,
  hall text,
  trainer_id uuid references public.trainers (id) on delete set null,
  note text not null default '',
  unique (slot_id, on_date)
);

-- A hall rented out: who, when, where, and optionally for how much.
create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  held_on date not null,
  start_time time not null,
  minutes int not null check (minutes > 0),
  hall text not null default '',
  who text not null check (length(trim(who)) > 0),
  price numeric(10, 2) check (price >= 0),
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['group_slot_changes', 'rentals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "staff only" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create trigger log_change after insert or update or delete on public.%I for each row execute function public.log_change()', t);
  end loop;
end $$;

-- The group classes as they really are between two dates: every weekly slot on
-- its weekday, with that date's change applied; a class moved to another day
-- shows on the day it was moved to. Cancelled ones are returned too, flagged.
create function public.group_classes_between(d1 date, d2 date)
returns table (
  slot_id uuid, group_id uuid, group_name text, on_date date, held_on date,
  start_time time, minutes int, hall text, trainer_id uuid, changed boolean, cancelled boolean
)
language sql stable set search_path = '' as $$
  -- classes that stay on their own day
  select s.id, s.group_id, g.name, d::date, d::date,
    coalesce(c.start_time, s.start_time), s.minutes, coalesce(c.hall, s.hall), coalesce(c.trainer_id, s.trainer_id),
    c.id is not null, coalesce(c.cancelled, false)
  from generate_series(d1::timestamp, d2::timestamp, interval '1 day') d
  join public.group_slots s on s.weekday = extract(dow from d)::int
  join public.groups g on g.id = s.group_id and not g.archived
  left join public.group_slot_changes c on c.slot_id = s.id and c.on_date = d::date
  where c.new_date is null or c.new_date = d::date
  union all
  -- classes moved onto a day in the range
  select s.id, s.group_id, g.name, c.on_date, c.new_date,
    coalesce(c.start_time, s.start_time), s.minutes, coalesce(c.hall, s.hall), coalesce(c.trainer_id, s.trainer_id),
    true, c.cancelled
  from public.group_slot_changes c
  join public.group_slots s on s.id = c.slot_id
  join public.groups g on g.id = s.group_id and not g.archived
  where c.new_date between d1 and d2 and c.new_date <> c.on_date;
$$;

-- A trainer can't give two things at once - judged against the group classes
-- as they really are that day (a cancelled class frees its trainer; a class
-- they cover for someone else blocks them).
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
    select 1 from public.group_classes_between(new.held_on, new.held_on) g
    where not g.cancelled and g.trainer_id = new.trainer_id
      and g.start_time < new.start_time + make_interval(mins => new.minutes)
      and new.start_time < g.start_time + make_interval(mins => g.minutes)
  ) then
    raise exception 'the trainer has a group class at that time';
  end if;
  return new;
end $$;
