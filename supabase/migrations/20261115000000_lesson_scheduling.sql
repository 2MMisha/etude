-- Private lessons are scheduled ahead and confirmed afterwards (owner,
-- 2026-11-12): a lesson starts as "planned" with a date and a time; it is
-- charged, and the trainer earns it, only once it is marked as taken place, a
-- no-show or a late cancellation. A lesson cancelled in time costs nothing.
-- ASCII only.

alter table public.lessons add column start_time time;
alter table public.lessons drop constraint lessons_status_check;
alter table public.lessons add constraint lessons_status_check
  check (status in ('planned', 'done', 'no_show', 'late_cancel', 'cancelled'));
alter table public.lessons alter column status set default 'planned';

-- A trainer can't give two lessons at once. Cancelled lessons and lessons
-- without a time don't count.
create function public.lessons_no_overlap() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status <> 'cancelled' and new.start_time is not null and exists (
    select 1 from public.lessons x
    where x.id <> new.id and x.trainer_id = new.trainer_id and x.held_on = new.held_on
      and x.status <> 'cancelled' and x.start_time is not null
      and x.start_time < new.start_time + make_interval(mins => new.minutes)
      and new.start_time < x.start_time + make_interval(mins => x.minutes)
  ) then
    raise exception 'the trainer already has a lesson at that time';
  end if;
  return new;
end $$;

create trigger lessons_no_overlap before insert or update on public.lessons
  for each row execute function public.lessons_no_overlap();

-- The charges of a lesson: one per student, the price split evenly. Does
-- nothing if they already exist.
create function public.lesson_put_charges(lid uuid) returns void
language sql set search_path = '' as $$
  insert into public.charges (student_id, kind, day, description, list_amount, amount, lesson_id)
  select ls.student_id, 'private', l.held_on, t.full_name || ' ' || l.minutes || U&'\2032',
    round(l.price / n.n, 2), round(l.price / n.n, 2), l.id
  from public.lessons l
  join public.trainers t on t.id = l.trainer_id
  join public.lesson_students ls on ls.lesson_id = l.id
  cross join lateral (select count(*) as n from public.lesson_students x where x.lesson_id = l.id) n
  where l.id = lid and not exists (select 1 from public.charges c where c.lesson_id = lid);
$$;

-- Schedule a lesson (or, with a status given, record one that already took
-- place). The price and the trainer's part come from the trainer's rate for
-- that length unless typed by hand.
-- l = {trainer_id, held_on, start_time, minutes, status, price, trainer_pay, note}
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
  if n < 1 or n > 2 then
    raise exception 'a private lesson has one or two students';
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

  insert into public.lessons (trainer_id, held_on, start_time, minutes, status, price, trainer_pay, note)
  values (
    (l ->> 'trainer_id')::uuid, coalesce(nullif(l ->> 'held_on', '')::date, current_date), nullif(l ->> 'start_time', '')::time,
    mins, st, total, pay, coalesce(l ->> 'note', '')
  )
  returning id into lid;
  insert into public.lesson_students (lesson_id, student_id) select lid, s from unnest(student_ids) s;
  if st in ('done', 'no_show', 'late_cancel') then
    perform public.lesson_put_charges(lid);
  end if;
  return lid;
end $$;

-- Confirm a lesson (took place / no-show / late cancellation: charged), cancel
-- it or put it back to planned (not charged: its charges go, unless one is
-- already paid, which stops the change).
create function public.set_lesson_status(lid uuid, new_status text) returns void
language plpgsql set search_path = '' as $$
begin
  update public.lessons set status = new_status where id = lid;
  if new_status in ('done', 'no_show', 'late_cancel') then
    perform public.lesson_put_charges(lid);
  else
    delete from public.charges where lesson_id = lid;
  end if;
end $$;

-- A trainer has earned a lesson once it is charged, not while it is only planned.
create or replace view public.trainer_balances with (security_invoker = true) as
select x.trainer_id, x.earned, x.paid, x.earned - x.paid as owed
from (
  select t.id as trainer_id,
    coalesce((select sum(l.trainer_pay) from public.lessons l where l.trainer_id = t.id and l.status in ('done', 'no_show', 'late_cancel')), 0) as earned,
    coalesce((select sum(p.amount) from public.trainer_payouts p where p.trainer_id = t.id), 0) as paid
  from public.trainers t
) x;
