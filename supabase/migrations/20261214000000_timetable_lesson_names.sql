-- The studio TV and the trainers' pages name a private lesson by its people
-- (owner, 2026-11-20): first names only, a couple as "Dana - Avi" (up to four,
-- in the order they were added, then a guest). The English name is used when
-- there is one, else the Hebrew. A lesson with nobody named stays
-- "Private lesson". Everything else in site_timetable() is unchanged.
-- ASCII only.

create or replace function public.site_timetable(d1 date, d2 date) returns table (
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
    select l.held_on, l.start_time, l.minutes, 'private',
      coalesce(nullif(concat_ws(' - ',
        (select string_agg(split_part(trim(coalesce(nullif(trim(s.full_name_en), ''), s.full_name)), ' ', 1), ' - ' order by ls.id)
           from public.lesson_students ls join public.students s on s.id = ls.student_id where ls.lesson_id = l.id),
        nullif(split_part(trim(l.guest_name), ' ', 1), '')), ''), 'Private lesson'),
      t.full_name, l.hall
    from public.lessons l join public.trainers t on t.id = l.trainer_id
    where l.held_on between d1 and d2 and l.start_time is not null and l.status in ('planned', 'done', 'no_show', 'late_cancel')
    union all
    select r.held_on, r.start_time, r.minutes, 'rental', 'Rental', '', r.hall
    from public.rentals r
    where r.held_on between d1 and d2
    order by 1, 2;
end $$;
