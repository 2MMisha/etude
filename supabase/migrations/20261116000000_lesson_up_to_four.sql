-- A private lesson can be shared by up to four students (owner, 2026-11-12).
-- The price is split evenly; when it doesn't divide to the agora, the first
-- student carries the remainder, so the parts always add up to the price.
-- ASCII only.

create or replace function public.lesson_put_charges(lid uuid) returns void
language sql set search_path = '' as $$
  insert into public.charges (student_id, kind, day, description, list_amount, amount, lesson_id)
  select x.student_id, 'private', x.held_on, x.label, x.part, x.part, x.lesson_id
  from (
    select ls.student_id, l.held_on, l.id as lesson_id, t.full_name || ' ' || l.minutes || U&'\2032' as label,
      round(l.price / n.n, 2)
        + case when row_number() over (order by ls.id) = 1 then l.price - round(l.price / n.n, 2) * n.n else 0 end as part
    from public.lessons l
    join public.trainers t on t.id = l.trainer_id
    join public.lesson_students ls on ls.lesson_id = l.id
    cross join lateral (select count(*) as n from public.lesson_students y where y.lesson_id = l.id) n
    where l.id = lid
  ) x
  where not exists (select 1 from public.charges c where c.lesson_id = lid);
$$;

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
  if n < 1 or n > 4 then
    raise exception 'a private lesson has one to four students';
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
