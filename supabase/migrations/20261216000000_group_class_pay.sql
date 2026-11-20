-- Group classes earn their trainer by themselves (owner, 2026-11-20). There is
-- no attendance to mark any more: every group class on the schedule that is
-- not cancelled earns, once it has ended, the trainer who really gave it (a
-- class handed to another trainer for one date earns that trainer), at that
-- trainer's private-lesson pay for the same length (Settings, trainer rates:
-- a fixed amount, or the percent of that length's price). No rate for that
-- length = nothing. Counting starts on 1 November 2026, or on the date in the
-- setting 'class_pay_from' ("YYYY-MM-DD") if staff set one.
-- The old per-group amount (group_slots.class_pay) and the old marks
-- (class_sessions) no longer count. ASCII only.

-- What a trainer gets for one lesson or class of this length, from their rates.
create function public.rate_pay(tid uuid, mins int) returns numeric
language sql stable security definer set search_path = '' as $$
  select case r.pay_kind when 'fixed' then r.pay_value else round(r.price * r.pay_value / 100, 2) end
  from public.trainer_rates r where r.trainer_id = tid and r.minutes = mins;
$$;
revoke all on function public.rate_pay(uuid, int) from public, anon, authenticated; -- rates are staff's: only the functions here use it

-- Every group class that counts: given (ended, not cancelled), by whom, and what it earned.
create function public.class_earnings() returns table (trainer_id uuid, slot_id uuid, held_on date, start_time time, minutes int, group_name text, pay numeric)
language sql stable security definer set search_path = '' as $$
  with span as (
    select coalesce((select (s.value #>> '{}')::date from public.settings s where s.id = 'class_pay_from'), date '2026-11-01') as d1,
           (now() at time zone 'Asia/Jerusalem') as now_local
  )
  select g.trainer_id, g.slot_id, g.held_on, g.start_time, g.minutes, g.group_name, coalesce(public.rate_pay(g.trainer_id, g.minutes), 0)
  from span, public.group_classes_between(span.d1, span.now_local::date) g
  where not g.cancelled and g.trainer_id is not null
    and g.held_on between span.d1 and span.now_local::date
    and g.held_on + g.start_time + make_interval(mins => g.minutes) <= span.now_local
    and (public.is_staff() or g.trainer_id = public.my_trainer_id()); -- staff see all, a trainer their own
$$;
revoke all on function public.class_earnings() from public, anon;
grant execute on function public.class_earnings() to authenticated;

create or replace view public.trainer_balances with (security_invoker = true) as
select x.trainer_id, x.earned, x.paid, x.earned - x.paid as owed
from (
  select t.id as trainer_id,
    coalesce((select sum(l.trainer_pay) from public.lessons l where l.trainer_id = t.id and l.status in ('done', 'no_show', 'late_cancel')), 0)
      + coalesce((select sum(c.pay) from public.class_earnings() c where c.trainer_id = t.id), 0) as earned,
    coalesce((select sum(p.amount) from public.trainer_payouts p where p.trainer_id = t.id), 0) as paid
  from public.trainers t
) x;

-- The trainer's own classes show what each one pays them.
create or replace function public.trainer_classes(d1 date, d2 date)
returns table (slot_id uuid, group_name text, on_date date, held_on date, start_time time, minutes int, hall text, changed boolean, marked boolean, pay numeric)
language sql stable security definer set search_path = '' as $$
  select g.slot_id, g.group_name, g.on_date, g.held_on, g.start_time, g.minutes, g.hall, g.changed,
    false, coalesce(public.rate_pay(g.trainer_id, g.minutes), 0)
  from public.group_classes_between(d1 - 60, d2 + 60) g
  where g.trainer_id = public.my_trainer_id() and not g.cancelled and g.held_on between d1 and d2
  order by g.held_on, g.start_time;
$$;
