-- Stage 6 (owner's go-ahead 2026-11-17): the site's timetable comes from the
-- CRM, not the Google Sheet. The build reads site_timetable() for a few weeks
-- and draws the trainers' app, the studio TV, the calendar feeds and
-- /data/timetable.json from it, the same way it drew them from the Sheet.
-- What it shows is public, so it carries no names of students or renters:
--   group classes as they really are that day (moves, other trainer, cancelled
--   ones left out), with the trainer and the hall;
--   one-time groups (master classes);
--   private lessons as "Private lesson" with the trainer, time and hall;
--   hall rentals as "Rental" in that hall.
-- At most ten weeks at a time. ASCII only.

create function public.site_timetable(d1 date, d2 date) returns table (
  on_date date, start_time time, minutes int, kind text, title text, trainer text, hall text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if d2 < d1 or d2 - d1 > 70 then raise exception 'at most ten weeks at a time'; end if;
  return query
    select g.on_date, g.start_time, g.minutes, 'class'::text, g.group_name, coalesce(t.full_name, ''), g.hall
    from public.group_classes_between(d1, d2) g left join public.trainers t on t.id = g.trainer_id
    where g.on_date between d1 and d2 and not g.cancelled
    union all
    select e.held_on, e.start_time, e.minutes, 'event', e.title, coalesce(t.full_name, ''), e.hall
    from public.events e left join public.trainers t on t.id = e.trainer_id
    where e.held_on between d1 and d2
    union all
    select l.held_on, l.start_time, l.minutes, 'private', 'Private lesson', t.full_name, l.hall
    from public.lessons l join public.trainers t on t.id = l.trainer_id
    where l.held_on between d1 and d2 and l.start_time is not null and l.status in ('planned', 'done', 'no_show', 'late_cancel')
    union all
    select r.held_on, r.start_time, r.minutes, 'rental', 'Rental', '', r.hall
    from public.rentals r
    where r.held_on between d1 and d2
    order by 1, 2;
end $$;
revoke all on function public.site_timetable(date, date) from public;
grant execute on function public.site_timetable(date, date) to anon, authenticated;
