-- Private lessons (owner, 2026-11-17):
--   * a lesson can be for someone who is not a client: lessons.guest_name, with
--     or without students (one to four people in all). Nothing is charged to an
--     account for the guest; staff take the guest's payment from the lesson
--     (payments.lesson_id), and the trainer earns the lesson as usual;
--   * a trainer puts a lesson on the schedule directly (trainer_add_lesson), at
--     their own rate, instead of asking for it;
--   * a hall check: a lesson may not start in a hall during a group class or a
--     master class there (refused here, whoever sets it); another private
--     lesson or a rental in that hall is allowed, and hall_check() lists what
--     is there so the screens can warn first.
-- ASCII only.

alter table public.lessons add column guest_name text not null default '';
alter table public.payments add column lesson_id uuid references public.lessons (id) on delete set null;

create or replace function public.record_payment(p jsonb, lines jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare pid uuid;
begin
  insert into public.payments (client_id, payer_name, what, rental_id, entry_id, lesson_id, paid_on, method, amount, cheque_number, cheque_bank, cheque_date, paper_doc, comment)
  values (
    nullif(p ->> 'client_id', '')::uuid, coalesce(p ->> 'payer_name', ''), coalesce(p ->> 'what', ''),
    nullif(p ->> 'rental_id', '')::uuid, nullif(p ->> 'entry_id', '')::uuid, nullif(p ->> 'lesson_id', '')::uuid,
    coalesce(nullif(p ->> 'paid_on', '')::date, current_date), p ->> 'method', (p ->> 'amount')::numeric,
    coalesce(p ->> 'cheque_number', ''), coalesce(p ->> 'cheque_bank', ''), nullif(p ->> 'cheque_date', '')::date,
    coalesce(p ->> 'paper_doc', ''), coalesce(p ->> 'comment', '')
  )
  returning id into pid;
  insert into public.payment_lines (payment_id, charge_id, amount)
  select pid, (l ->> 'charge_id')::uuid, (l ->> 'amount')::numeric
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) l;
  return pid;
end $$;

create or replace function public.record_lesson(l jsonb, student_ids uuid[]) returns uuid
language plpgsql set search_path = '' as $$
declare
  lid uuid;
  n int := coalesce(array_length(student_ids, 1), 0);
  guest text := public.clean(l ->> 'guest_name', 120);
  r public.trainer_rates;
  total numeric;
  pay numeric;
  mins int := (l ->> 'minutes')::int;
  st text := coalesce(nullif(l ->> 'status', ''), 'planned');
begin
  if n + (case when guest = '' then 0 else 1 end) < 1 or n + (case when guest = '' then 0 else 1 end) > 4 then
    raise exception 'a private lesson has one to four people';
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

  insert into public.lessons (trainer_id, held_on, start_time, minutes, hall, status, price, trainer_pay, note, guest_name)
  values (
    (l ->> 'trainer_id')::uuid, coalesce(nullif(l ->> 'held_on', '')::date, current_date), nullif(l ->> 'start_time', '')::time,
    mins, coalesce(l ->> 'hall', ''), st, total, pay, coalesce(l ->> 'note', ''), guest
  )
  returning id into lid;
  insert into public.lesson_students (lesson_id, student_id) select lid, s from unnest(student_ids) s;
  if st in ('done', 'no_show', 'late_cancel') then
    perform public.lesson_put_charges(lid);
  end if;
  return lid;
end $$;

-- What is in a hall at a given time: group classes, master classes, other
-- private lessons (trainer only, no names) and rentals. For staff and trainers.
create function public.hall_check(d date, t time, mins int, h text, skip uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  t2 time := t + make_interval(mins => mins);
begin
  if not (public.is_staff() or public.my_trainer_id() is not null) then raise exception 'staff or trainers only'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'start') from (
    select jsonb_build_object('kind', 'group', 'title', g.group_name, 'trainer', coalesce(tr.full_name, ''), 'start', to_char(g.start_time, 'HH24:MI'), 'end', to_char(g.start_time + make_interval(mins => g.minutes), 'HH24:MI')) as x
    from public.group_classes_between(d, d) g left join public.trainers tr on tr.id = g.trainer_id
    where g.on_date = d and not g.cancelled and g.hall = h and g.start_time < t2 and t < g.start_time + make_interval(mins => g.minutes)
    union all
    select jsonb_build_object('kind', 'event', 'title', e.title, 'trainer', coalesce(tr.full_name, ''), 'start', to_char(e.start_time, 'HH24:MI'), 'end', to_char(e.start_time + make_interval(mins => e.minutes), 'HH24:MI'))
    from public.events e left join public.trainers tr on tr.id = e.trainer_id
    where e.held_on = d and e.hall = h and e.start_time < t2 and t < e.start_time + make_interval(mins => e.minutes)
    union all
    select jsonb_build_object('kind', 'lesson', 'title', '', 'trainer', tr.full_name, 'start', to_char(l.start_time, 'HH24:MI'), 'end', to_char(l.start_time + make_interval(mins => l.minutes), 'HH24:MI'))
    from public.lessons l join public.trainers tr on tr.id = l.trainer_id
    where l.held_on = d and l.hall = h and l.id is distinct from skip and l.status in ('planned', 'requested', 'done', 'no_show', 'late_cancel')
      and l.start_time is not null and l.start_time < t2 and t < l.start_time + make_interval(mins => l.minutes)
    union all
    select jsonb_build_object('kind', 'rental', 'title', '', 'trainer', '', 'start', to_char(r.start_time, 'HH24:MI'), 'end', to_char(r.start_time + make_interval(mins => r.minutes), 'HH24:MI'))
    from public.rentals r
    where r.held_on = d and r.hall = h and r.start_time < t2 and t < r.start_time + make_interval(mins => r.minutes)
  ) q), '[]');
end $$;
revoke all on function public.hall_check(date, time, int, text, uuid) from public, anon;
grant execute on function public.hall_check(date, time, int, text, uuid) to authenticated;

-- A lesson may not take a hall that has a group class or a master class then.
-- Checked when a lesson is set or moved, not when only its status changes.
create function public.lessons_hall_free() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status not in ('planned', 'requested') or new.start_time is null or new.hall = '' then return new; end if;
  if tg_op = 'UPDATE' and (new.held_on, new.start_time, new.minutes, new.hall) is not distinct from (old.held_on, old.start_time, old.minutes, old.hall) then
    return new;
  end if;
  if exists (
    select 1 from public.group_classes_between(new.held_on, new.held_on) g
    where g.on_date = new.held_on and not g.cancelled and g.hall = new.hall
      and g.start_time < new.start_time + make_interval(mins => new.minutes)
      and new.start_time < g.start_time + make_interval(mins => g.minutes)
  ) then
    raise exception 'the hall has a group class at that time';
  end if;
  if exists (
    select 1 from public.events e
    where e.held_on = new.held_on and e.hall = new.hall
      and e.start_time < new.start_time + make_interval(mins => new.minutes)
      and new.start_time < e.start_time + make_interval(mins => e.minutes)
  ) then
    raise exception 'the hall has a master class at that time';
  end if;
  return new;
end $$;
create trigger lessons_hall_free before insert or update on public.lessons
  for each row execute function public.lessons_hall_free();

-- The trainer sets the lesson: straight onto the schedule, theirs, at their rate.
create function public.trainer_add_lesson(l jsonb, student_ids uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare tid uuid := public.my_trainer_id();
begin
  if tid is null then
    raise exception 'this login is not linked to a trainer';
  end if;
  return public.record_lesson(
    l || jsonb_build_object('trainer_id', tid, 'status', 'planned', 'price', '', 'trainer_pay', ''),
    coalesce(student_ids, '{}')
  );
end $$;
revoke all on function public.trainer_add_lesson(jsonb, uuid[]) from public, anon;
grant execute on function public.trainer_add_lesson(jsonb, uuid[]) to authenticated;

-- The trainer's own lessons now name a guest too.
create or replace function public.trainer_lessons(d1 date, d2 date)
returns table (
  id uuid, held_on date, start_time time, minutes int, hall text, status text,
  price numeric, trainer_pay numeric, note text, students text, request jsonb
)
language sql stable security definer set search_path = '' as $$
  select l.id, l.held_on, l.start_time, l.minutes, l.hall, l.status, l.price, l.trainer_pay, l.note,
    nullif(concat_ws(' + ',
      (select string_agg(s.full_name, ' + ' order by ls.id)
         from public.lesson_students ls join public.students s on s.id = ls.student_id where ls.lesson_id = l.id),
      nullif(l.guest_name, '')), ''),
    (select jsonb_build_object('kind', q.kind, 'new_date', q.new_date, 'new_time', q.new_time, 'note', q.note)
       from public.lesson_requests q where q.lesson_id = l.id and q.status = 'pending' order by q.created_at desc limit 1)
  from public.lessons l
  where l.trainer_id = public.my_trainer_id() and l.held_on between d1 and d2
  order by l.held_on, l.start_time;
$$;

-- A guest takes a share of the price too: students sharing a lesson with a
-- guest are charged their part, not the whole.
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
    cross join lateral (select count(*) + case when l.guest_name = '' then 0 else 1 end as n
                        from public.lesson_students y where y.lesson_id = l.id) n
    where l.id = lid
  ) x
  where not exists (select 1 from public.charges c where c.lesson_id = lid);
$$;
