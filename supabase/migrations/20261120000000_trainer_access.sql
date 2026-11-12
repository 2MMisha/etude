-- Stage 3b: what a trainer may see and do from the trainers' app.
-- A trainer never reads the tables: everything goes through the functions
-- below, which work out who is asking (the trainer linked to the login) and
-- only ever touch that trainer's own lessons. New lessons and changes are
-- requests; the admin decides. ASCII only.

alter table public.lessons drop constraint lessons_status_check;
alter table public.lessons add constraint lessons_status_check
  check (status in ('requested', 'planned', 'done', 'no_show', 'late_cancel', 'cancelled'));

-- A trainer asking to move or cancel one of their planned lessons.
create table public.lesson_requests (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  kind text not null check (kind in ('move', 'cancel')),
  new_date date,
  new_time time,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  decided_by uuid,
  decided_at timestamptz,
  constraint move_needs_when check (kind <> 'move' or (new_date is not null and new_time is not null))
);

alter table public.lesson_requests enable row level security;
revoke all on public.lesson_requests from anon, authenticated;
grant select, insert, update, delete on public.lesson_requests to authenticated;
create policy "staff only" on public.lesson_requests for all to authenticated using (public.is_staff()) with check (public.is_staff());
create trigger log_change after insert or update or delete on public.lesson_requests
  for each row execute function public.log_change();

-- The trainer this login belongs to: linked in Settings, active, and holding the trainer role.
create function public.my_trainer_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select t.id from public.trainers t
  where t.user_id = (select auth.uid()) and not t.archived and public.has_role('trainer');
$$;

-- My lessons between two dates, with the students' names and any request still waiting.
create function public.trainer_lessons(d1 date, d2 date)
returns table (
  id uuid, held_on date, start_time time, minutes int, hall text, status text,
  price numeric, trainer_pay numeric, note text, students text, request jsonb
)
language sql stable security definer set search_path = '' as $$
  select l.id, l.held_on, l.start_time, l.minutes, l.hall, l.status, l.price, l.trainer_pay, l.note,
    (select string_agg(s.full_name, ' + ' order by ls.id)
       from public.lesson_students ls join public.students s on s.id = ls.student_id where ls.lesson_id = l.id),
    (select jsonb_build_object('kind', q.kind, 'new_date', q.new_date, 'new_time', q.new_time, 'note', q.note)
       from public.lesson_requests q where q.lesson_id = l.id and q.status = 'pending' order by q.created_at desc limit 1)
  from public.lessons l
  where l.trainer_id = public.my_trainer_id() and l.held_on between d1 and d2
  order by l.held_on, l.start_time;
$$;

-- What I need to ask for a lesson: the students to choose from (names only) and my lesson lengths.
create function public.trainer_students() returns table (id uuid, full_name text, partner_id uuid)
language sql stable security definer set search_path = '' as $$
  select s.id, s.full_name, s.partner_id from public.students s
  where not s.archived and public.my_trainer_id() is not null
  order by s.full_name;
$$;

create function public.trainer_rates_mine() returns table (minutes int, price numeric)
language sql stable security definer set search_path = '' as $$
  select r.minutes, r.price from public.trainer_rates r where r.trainer_id = public.my_trainer_id() order by r.minutes;
$$;

-- Ask for a new lesson. It is mine whatever was sent, at my rate, and waits for the admin.
create function public.trainer_request_lesson(l jsonb, student_ids uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare tid uuid := public.my_trainer_id();
begin
  if tid is null then
    raise exception 'this login is not linked to a trainer';
  end if;
  return public.record_lesson(
    l || jsonb_build_object('trainer_id', tid, 'status', 'requested', 'price', '', 'trainer_pay', ''),
    student_ids
  );
end $$;

-- Take back my own request that nobody has decided on yet.
create function public.trainer_withdraw(lid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.lessons where id = lid and trainer_id = public.my_trainer_id() and status = 'requested';
  if not found then
    raise exception 'only your own lesson that is still waiting can be withdrawn';
  end if;
end $$;

-- Ask to move or cancel one of my planned lessons. A newer request replaces an older one still waiting.
create function public.trainer_request_change(lid uuid, k text, d date, t time, n text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if not exists (select 1 from public.lessons where id = lid and trainer_id = public.my_trainer_id() and status = 'planned') then
    raise exception 'only your own planned lesson can be changed';
  end if;
  delete from public.lesson_requests where lesson_id = lid and status = 'pending';
  insert into public.lesson_requests (lesson_id, kind, new_date, new_time, note)
  values (lid, k, d, t, coalesce(n, ''))
  returning id into rid;
  return rid;
end $$;

-- Say what happened at my lesson, once its day has come: took place, no-show or late cancellation.
create function public.trainer_confirm(lid uuid, st text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if st not in ('done', 'no_show', 'late_cancel') then
    raise exception 'unknown outcome';
  end if;
  if not exists (
    select 1 from public.lessons
    where id = lid and trainer_id = public.my_trainer_id() and status = 'planned'
      and held_on <= (now() at time zone 'Asia/Jerusalem')::date
  ) then
    raise exception 'only your own planned lesson can be confirmed, on its day or after';
  end if;
  perform public.set_lesson_status(lid, st);
end $$;

-- What I have earned, what I was given, what is still to come - and the halls, to ask for a lesson in one.
create function public.trainer_summary() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', t.full_name, 'earned', b.earned, 'paid', b.paid, 'owed', b.owed,
    'halls', coalesce((select value from public.settings where id = 'halls'), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(jsonb_build_object('paid_on', p.paid_on, 'amount', p.amount, 'comment', p.comment) order by p.paid_on desc, p.created_at desc)
      from public.trainer_payouts p where p.trainer_id = t.id
    ), '[]'::jsonb)
  )
  from public.trainers t join public.trainer_balances b on b.trainer_id = t.id
  where t.id = public.my_trainer_id();
$$;

-- The admin's side: decide on a move or a cancellation. If the new time clashes, nothing changes.
create function public.decide_lesson_request(rid uuid, approve boolean) returns void
language plpgsql set search_path = '' as $$
declare r public.lesson_requests;
begin
  select * into r from public.lesson_requests where id = rid and status = 'pending';
  if not found then
    raise exception 'this request is not waiting';
  end if;
  if approve and r.kind = 'move' then
    update public.lessons set held_on = r.new_date, start_time = r.new_time where id = r.lesson_id;
  elsif approve then
    perform public.set_lesson_status(r.lesson_id, 'cancelled');
  end if;
  update public.lesson_requests
  set status = case when approve then 'approved' else 'rejected' end, decided_by = (select auth.uid()), decided_at = now()
  where id = rid;
end $$;

-- Only signed-in users may call the trainer functions at all.
revoke all on function
  public.my_trainer_id(), public.trainer_lessons(date, date), public.trainer_students(), public.trainer_rates_mine(),
  public.trainer_request_lesson(jsonb, uuid[]), public.trainer_withdraw(uuid),
  public.trainer_request_change(uuid, text, date, time, text), public.trainer_confirm(uuid, text), public.trainer_summary()
from public, anon;
grant execute on function
  public.my_trainer_id(), public.trainer_lessons(date, date), public.trainer_students(), public.trainer_rates_mine(),
  public.trainer_request_lesson(jsonb, uuid[]), public.trainer_withdraw(uuid),
  public.trainer_request_change(uuid, text, date, time, text), public.trainer_confirm(uuid, text), public.trainer_summary()
to authenticated;
