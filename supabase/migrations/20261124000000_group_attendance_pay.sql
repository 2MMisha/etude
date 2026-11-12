-- Group classes: attendance and the trainer's pay.
-- A group class "took place" once someone marks it: that records who came and
-- earns the trainer who gave it the pay set on its weekly slot. The admin can
-- mark any class; a trainer can mark their own, on its day or after, from the
-- trainers' app - through functions that check it is theirs. ASCII only.

-- What the trainer gets for giving this class once.
alter table public.group_slots add column class_pay numeric(10, 2) not null default 0 check (class_pay >= 0);

-- A group class that took place. held_on is the class's normal date (the slot's
-- weekday), also when it was moved for that week.
create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.group_slots (id) on delete cascade,
  held_on date not null,
  trainer_id uuid references public.trainers (id) on delete set null,
  pay numeric(10, 2) not null default 0 check (pay >= 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (slot_id, held_on)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  present boolean not null default true,
  unique (session_id, student_id)
);

do $$
declare t text;
begin
  foreach t in array array['class_sessions', 'attendance'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "staff only" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create trigger log_change after insert or update or delete on public.%I for each row execute function public.log_change()', t);
  end loop;
end $$;

-- Who is in the group, and whether they were marked present that day.
create function public.class_roster(sid uuid, d date)
returns table (student_id uuid, full_name text, present boolean, marked boolean)
language sql stable set search_path = '' as $$
  select s.id, s.full_name, coalesce(a.present, false), cs.id is not null
  from public.group_slots gs
  join public.enrollments e on e.group_id = gs.group_id
  join public.students s on s.id = e.student_id and not s.archived
  left join public.class_sessions cs on cs.slot_id = gs.id and cs.held_on = d
  left join public.attendance a on a.session_id = cs.id and a.student_id = s.id
  where gs.id = sid
  order by s.full_name;
$$;

-- Mark a class as taken place, with who came. Marking again replaces the list.
-- The trainer is whoever really gave it that day (a substitute, if one was set).
create function public.mark_class(sid uuid, d date, present_ids uuid[]) returns uuid
language plpgsql set search_path = '' as $$
declare
  session uuid;
  who uuid;
  earn numeric;
begin
  select g.trainer_id into who from public.group_classes_between(d - 60, d + 60) g where g.slot_id = sid and g.on_date = d limit 1;
  select class_pay into earn from public.group_slots where id = sid;
  if earn is null then
    raise exception 'no such class';
  end if;
  insert into public.class_sessions (slot_id, held_on, trainer_id, pay) values (sid, d, who, earn)
  on conflict (slot_id, held_on) do update set trainer_id = excluded.trainer_id
  returning id into session;
  delete from public.attendance where session_id = session;
  insert into public.attendance (session_id, student_id, present)
  select session, r.student_id, r.student_id = any (coalesce(present_ids, '{}'))
  from public.class_roster(sid, d) r;
  return session;
end $$;

-- What a trainer has earned: confirmed private lessons, and group classes that took place.
create or replace view public.trainer_balances with (security_invoker = true) as
select x.trainer_id, x.earned, x.paid, x.earned - x.paid as owed
from (
  select t.id as trainer_id,
    coalesce((select sum(l.trainer_pay) from public.lessons l where l.trainer_id = t.id and l.status in ('done', 'no_show', 'late_cancel')), 0)
      + coalesce((select sum(cs.pay) from public.class_sessions cs where cs.trainer_id = t.id), 0) as earned,
    coalesce((select sum(p.amount) from public.trainer_payouts p where p.trainer_id = t.id), 0) as paid
  from public.trainers t
) x;

-- The trainer's side, from their app. Each checks the class is theirs that day.
create function public.trainer_classes(d1 date, d2 date)
returns table (slot_id uuid, group_name text, on_date date, held_on date, start_time time, minutes int, hall text, changed boolean, marked boolean, pay numeric)
language sql stable security definer set search_path = '' as $$
  select g.slot_id, g.group_name, g.on_date, g.held_on, g.start_time, g.minutes, g.hall, g.changed,
    exists (select 1 from public.class_sessions cs where cs.slot_id = g.slot_id and cs.held_on = g.on_date),
    (select gs.class_pay from public.group_slots gs where gs.id = g.slot_id)
  from public.group_classes_between(d1 - 60, d2 + 60) g
  where g.trainer_id = public.my_trainer_id() and not g.cancelled and g.held_on between d1 and d2
  order by g.held_on, g.start_time;
$$;

create function public.trainer_owns_class(sid uuid, d date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_classes_between(d - 60, d + 60) g
    where g.slot_id = sid and g.on_date = d and not g.cancelled and g.trainer_id = public.my_trainer_id()
  );
$$;

create function public.trainer_class_roster(sid uuid, d date)
returns table (student_id uuid, full_name text, present boolean, marked boolean)
language sql stable security definer set search_path = '' as $$
  select r.* from public.class_roster(sid, d) r where public.trainer_owns_class(sid, d);
$$;

create function public.trainer_mark_class(sid uuid, d date, present_ids uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not public.trainer_owns_class(sid, d) then
    raise exception 'only your own class can be marked';
  end if;
  if (select g.held_on from public.group_classes_between(d - 60, d + 60) g where g.slot_id = sid and g.on_date = d limit 1)
     > (now() at time zone 'Asia/Jerusalem')::date then
    raise exception 'a class can be marked on its day or after';
  end if;
  return public.mark_class(sid, d, present_ids);
end $$;

revoke all on function
  public.trainer_classes(date, date), public.trainer_owns_class(uuid, date),
  public.trainer_class_roster(uuid, date), public.trainer_mark_class(uuid, date, uuid[])
from public, anon;
grant execute on function
  public.trainer_classes(date, date), public.trainer_owns_class(uuid, date),
  public.trainer_class_roster(uuid, date), public.trainer_mark_class(uuid, date, uuid[])
to authenticated;
