-- The trainer's pay for a private lesson follows what the lesson is charged
-- (owner, 2026-11-20): their rate times the part of the price that is charged
-- after discounts. A lesson of 150 with one student paying 75 and the other 0
-- earns half the rate. A guest's share counts in full (the guest pays it), a
-- charge changed by hand counts as changed. Before the lesson is charged it is
-- worked out from the discounts set on it. Family debts do not touch it.
-- lessons.trainer_pay stays the full rate; lesson_earning() is what is earned.
-- Also: the monthly report counted every lesson's pay, cancelled ones included;
-- it now reads lesson_earnings (charged lessons only) plus the group classes.
-- ASCII only.

create function public.lesson_earning(lid uuid) returns numeric
language sql stable set search_path = '' as $$
  select case when coalesce(l.price, 0) = 0 then l.trainer_pay else
    round(l.trainer_pay * least(1, greatest(0, (
      case when exists (select 1 from public.charges c where c.lesson_id = l.id)
        then (select sum(c.amount) from public.charges c where c.lesson_id = l.id)
        else (select coalesce(sum(greatest(0, (l.price / n.n) * (1 - ls.discount_pct / 100) - ls.discount_ils)), 0)
              from public.lesson_students ls where ls.lesson_id = l.id)
      end
      + case when l.guest_name <> '' then l.price / n.n else 0 end
    ) / l.price)), 2) end
  from public.lessons l
  cross join lateral (select greatest(1, count(*) + case when l.guest_name = '' then 0 else 1 end) as n
                      from public.lesson_students y where y.lesson_id = l.id) n
  where l.id = lid;
$$;
revoke all on function public.lesson_earning(uuid) from public, anon;
grant execute on function public.lesson_earning(uuid) to authenticated;

-- Every lesson with what it earns its trainer (staff read it; the rows follow the lessons' rules).
create view public.lesson_earnings with (security_invoker = true) as
select l.id as lesson_id, l.trainer_id, l.held_on, l.status, l.trainer_pay as full_pay, public.lesson_earning(l.id) as earned
from public.lessons l;
revoke all on public.lesson_earnings from public, anon;
grant select on public.lesson_earnings to authenticated;

create or replace view public.trainer_balances with (security_invoker = true) as
select x.trainer_id, x.earned, x.paid, x.earned - x.paid as owed
from (
  select t.id as trainer_id,
    coalesce((select sum(public.lesson_earning(l.id)) from public.lessons l where l.trainer_id = t.id and l.status in ('done', 'no_show', 'late_cancel')), 0)
      + coalesce((select sum(c.pay) from public.class_earnings() c where c.trainer_id = t.id), 0) as earned,
    coalesce((select sum(p.amount) from public.trainer_payouts p where p.trainer_id = t.id), 0) as paid
  from public.trainers t
) x;

-- The trainer's own lessons show what each one earns them.
create or replace function public.trainer_lessons(d1 date, d2 date)
returns table (
  id uuid, held_on date, start_time time, minutes int, hall text, status text,
  price numeric, trainer_pay numeric, note text, students text, request jsonb, students_en text
)
language sql stable security definer set search_path = '' as $$
  select l.id, l.held_on, l.start_time, l.minutes, l.hall, l.status, l.price, public.lesson_earning(l.id), l.note,
    nullif(concat_ws(' + ',
      (select string_agg(s.full_name, ' + ' order by ls.id)
         from public.lesson_students ls join public.students s on s.id = ls.student_id where ls.lesson_id = l.id),
      nullif(l.guest_name, '')), ''),
    (select jsonb_build_object('kind', q.kind, 'new_date', q.new_date, 'new_time', q.new_time, 'note', q.note)
       from public.lesson_requests q where q.lesson_id = l.id and q.status = 'pending' order by q.created_at desc limit 1),
    nullif(concat_ws(' + ',
      (select string_agg(coalesce(nullif(trim(s.full_name_en), ''), s.full_name), ' + ' order by ls.id)
         from public.lesson_students ls join public.students s on s.id = ls.student_id where ls.lesson_id = l.id),
      nullif(l.guest_name, '')), '')
  from public.lessons l
  where l.trainer_id = public.my_trainer_id() and l.held_on between d1 and d2
  order by l.held_on, l.start_time;
$$;
