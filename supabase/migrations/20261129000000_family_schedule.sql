-- The schedule inside the family's account in the students' app (owner,
-- 2026-11-14): the timetable as the CRM has it - group classes with their
-- changes and cancellations, one-time groups (master classes) - plus the
-- family's own private lessons. Other people's private lessons are never shown.
-- Only for a family the studio has let in. "mine" marks a group one of the
-- family's students is in. At most about two months at a time. ASCII only.

create function public.family_schedule(d1 date, d2 date) returns jsonb
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
                      where e.group_id = g.group_id and s.client_id = fam and not s.archived)) as x
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

revoke all on function public.family_schedule(date, date) from public, anon;
grant execute on function public.family_schedule(date, date) to authenticated;

-- The timetable for everyone with the students' app, signed in or not (it
-- replaces the Google Sheet there): group classes as they really are, and
-- one-time groups. No private lessons, no cancelled classes. Up to a month.
create function public.public_timetable(d1 date, d2 date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if d2 < d1 or d2 - d1 > 31 then raise exception 'at most a month at a time'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'on_date', x ->> 'start') from (
    select jsonb_build_object('kind', 'class', 'title', g.group_name, 'on_date', g.on_date, 'start', to_char(g.start_time, 'HH24:MI'),
      'minutes', g.minutes, 'hall', g.hall, 'trainer', t.full_name) as x
    from public.group_classes_between(d1, d2) g left join public.trainers t on t.id = g.trainer_id
    where g.on_date between d1 and d2 and not g.cancelled
    union all
    select jsonb_build_object('kind', 'event', 'title', e.title, 'on_date', e.held_on, 'start', to_char(e.start_time, 'HH24:MI'),
      'minutes', e.minutes, 'hall', e.hall, 'trainer', t.full_name)
    from public.events e left join public.trainers t on t.id = e.trainer_id
    where e.held_on between d1 and d2
  ) q), '[]');
end $$;

revoke all on function public.public_timetable(date, date) from public;
grant execute on function public.public_timetable(date, date) to anon, authenticated;
