-- A group can include other groups (owner, 2026-11-15): Ballroom students who
-- take both styles are in one group, "Ballroom LA+ST", which includes the
-- Latin and the Standard groups. They see and get notified about the classes
-- of both; whoever takes one style is in that style's group only. The price
-- still comes from the programme and the classes a week of the enrollment.
-- A group can also say how many classes a week a new enrollment counts as
-- (Latin 2, Standard 2, LA+ST 3), so the right price comes without typing it.
-- ASCII only.

alter table public.groups
  add column includes uuid[] not null default '{}',
  add column per_week_default int check (per_week_default between 1 and 7);

-- Does a student enrolled in member_group attend the classes of class_group?
create function public.in_group(member_group uuid, class_group uuid) returns boolean
language sql stable set search_path = '' as $$
  select member_group = class_group
    or exists (select 1 from public.groups g where g.id = member_group and class_group = any (g.includes));
$$;

-- A new enrollment without a number takes the group's default (or 1).
alter table public.enrollments alter column per_week drop default;
create function public.enrollment_default() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.per_week is null then
    new.per_week := coalesce((select per_week_default from public.groups where id = new.group_id), 1);
  end if;
  return new;
end $$;
create trigger enrollment_default before insert on public.enrollments for each row execute function public.enrollment_default();

create or replace function public.family_schedule(d1 date, d2 date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  fam uuid := public.my_family();
begin
  if fam is null or not public.family_approved() then return '[]'; end if;
  if d2 < d1 or d2 - d1 > 62 then raise exception 'at most two months at a time'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'on_date', x ->> 'start') from (
    -- group classes, as they really are that week
    select jsonb_build_object(
      'kind', 'class', 'title', g.group_name, 'on_date', g.on_date, 'start', to_char(g.start_time, 'HH24:MI'), 'minutes', g.minutes,
      'hall', g.hall, 'trainer', t.full_name, 'changed', g.changed, 'cancelled', g.cancelled,
      'mine', exists (select 1 from public.enrollments e join public.students s on s.id = e.student_id
                      where public.in_group(e.group_id, g.group_id) and s.client_id = fam and not s.archived)) as x
    from public.group_classes_between(d1, d2) g
    left join public.trainers t on t.id = g.trainer_id
    where g.on_date between d1 and d2
    union all
    -- one-time groups (master classes)
    select jsonb_build_object(
      'kind', 'event', 'title', e.title, 'on_date', e.held_on, 'start', to_char(e.start_time, 'HH24:MI'), 'minutes', e.minutes,
      'hall', e.hall, 'trainer', t.full_name, 'changed', false, 'cancelled', false,
      'mine', exists (select 1 from public.entries n join public.students s on s.id = n.student_id where n.event_id = e.id and s.client_id = fam))
    from public.events e left join public.trainers t on t.id = e.trainer_id
    where e.held_on between d1 and d2
    union all
    -- the family's own private lessons
    select jsonb_build_object(
      'kind', 'lesson', 'title', (select string_agg(s.full_name, ', ' order by s.full_name) from public.lesson_students ls
                                  join public.students s on s.id = ls.student_id where ls.lesson_id = l.id and s.client_id = fam),
      'on_date', l.held_on, 'start', to_char(l.start_time, 'HH24:MI'), 'minutes', l.minutes,
      'hall', l.hall, 'trainer', t.full_name, 'changed', false, 'cancelled', l.status in ('cancelled', 'late_cancel'), 'mine', true)
    from public.lessons l join public.trainers t on t.id = l.trainer_id
    where l.held_on between d1 and d2 and l.start_time is not null and l.status <> 'requested'
      and exists (select 1 from public.lesson_students ls join public.students s on s.id = ls.student_id where ls.lesson_id = l.id and s.client_id = fam)
  ) q), '[]');
end $$;

create or replace function public.class_roster(sid uuid, d date)
returns table (student_id uuid, full_name text, present boolean, marked boolean)
language sql stable set search_path = '' as $$
  select s.id, s.full_name, coalesce(a.present, false), cs.id is not null
  from public.group_slots gs
  join public.enrollments e on public.in_group(e.group_id, gs.group_id)
  join public.students s on s.id = e.student_id and not s.archived
  left join public.class_sessions cs on cs.slot_id = gs.id and cs.held_on = d
  left join public.attendance a on a.session_id = cs.id and a.student_id = s.id
  where gs.id = sid
  order by s.full_name;
$$;

create or replace function public.class_change_push() returns trigger
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
  select array_agg(e.student_id) into kids from public.enrollments e where public.in_group(e.group_id, s.group_id);
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
