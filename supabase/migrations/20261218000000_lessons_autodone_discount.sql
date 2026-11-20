-- Private lessons (owner, 2026-11-20):
--   * no confirming any more: a planned lesson that has ended counts as taken
--     place by itself (lessons_autodone, run by pg_cron every 10 minutes): it
--     is charged to the families and earns the trainer. Staff or the trainer
--     can still set "no-show" or "late cancellation" afterwards (charged the
--     same) or "cancelled" (in time: the charge goes);
--   * a discount per participant of a lesson: lesson_students.discount_pct
--     (0-100). The participant's charge is their share less the discount
--     (list_amount keeps the share); changing it later changes the charge.
--     The trainer's pay is not touched by a discount.
-- ASCII only.

alter table public.lesson_students
  add column discount_pct numeric(5, 2) not null default 0 check (discount_pct >= 0 and discount_pct <= 100);

create or replace function public.lesson_put_charges(lid uuid) returns void
language sql set search_path = '' as $$
  insert into public.charges (student_id, kind, day, description, list_amount, amount, lesson_id)
  select x.student_id, 'private', x.held_on, x.label, x.part, round(x.part * (1 - x.discount_pct / 100), 2), x.lesson_id
  from (
    select ls.student_id, ls.discount_pct, l.held_on, l.id as lesson_id, t.full_name || ' ' || l.minutes || U&'\2032' as label,
      round(l.price / n.n, 2)
        + case when row_number() over (order by ls.id) = 1 then l.price - round(l.price / n.n, 2) * n.n else 0 end as part
    from public.lessons l
    join public.trainers t on t.id = l.trainer_id
    join public.lesson_students ls on ls.lesson_id = l.id
    cross join lateral (select count(*) + case when l.guest_name = '' then 0 else 1 end as n
                        from public.lesson_students y where y.lesson_id = l.id) n
    where l.id = lid
  ) x
  where not exists (select 1 from public.charges c where c.lesson_id = lid);
$$;

-- A discount set or changed after the lesson was charged: the charge follows.
create function public.lesson_discount_follow() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.charges c set amount = round(c.list_amount * (1 - new.discount_pct / 100), 2)
  where c.lesson_id = new.lesson_id and c.student_id = new.student_id and c.kind = 'private';
  return new;
end $$;
revoke all on function public.lesson_discount_follow() from public, anon;
grant execute on function public.lesson_discount_follow() to authenticated;
create trigger lesson_students_discount after update of discount_pct on public.lesson_students
  for each row when (new.discount_pct is distinct from old.discount_pct)
  execute function public.lesson_discount_follow();

-- Every planned lesson that has ended becomes "took place", with its charges.
create function public.lessons_autodone() returns int
language plpgsql security definer set search_path = '' as $$
declare
  now_local timestamp := now() at time zone 'Asia/Jerusalem';
  r record;
  n int := 0;
begin
  for r in
    select l.id from public.lessons l
    where l.status = 'planned'
      and l.held_on + coalesce(l.start_time, time '23:59') + make_interval(mins => l.minutes) <= now_local
  loop
    update public.lessons set status = 'done' where id = r.id;
    perform public.lesson_put_charges(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.lessons_autodone() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('etude-lessons-done', '*/10 * * * *', 'select public.lessons_autodone()');
  end if;
end $$;

-- The lessons already past and not confirmed count now.
select public.lessons_autodone();
