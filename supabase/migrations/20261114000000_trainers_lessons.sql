-- Stage 3a: trainers and what their private lessons cost and pay, dance
-- partners (couples), the private-lesson log, trainer earnings and payouts,
-- expenses. Staff only for now; trainers get their own access with their app.
-- ASCII only, so it survives a copy-paste in any encoding. No amounts here.

create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  user_id uuid unique references auth.users (id) on delete set null, -- their login, once they have one
  archived boolean not null default false
);

-- A private lesson with this trainer, per length: what the client pays for the
-- lesson (a couple splits it) and what the trainer gets - a fixed amount or a
-- percentage of that price.
create table public.trainer_rates (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete cascade,
  minutes int not null check (minutes > 0),
  price numeric(10, 2) not null check (price >= 0),
  pay_kind text not null default 'percent' check (pay_kind in ('fixed', 'percent')),
  pay_value numeric(10, 2) not null default 100 check (pay_value >= 0),
  unique (trainer_id, minutes)
);

-- Private lessons are priced per trainer now; the old per-type rows go.
delete from public.prices where kind = 'private';

-- A dance partner: the two always point at each other.
alter table public.students add column partner_id uuid references public.students (id) on delete set null;

create function public.students_partner_sync() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.partner_id = new.id then
    raise exception 'a student cannot be their own partner';
  end if;
  -- Let go of the previous partner, and of whoever the new partner danced with before.
  if old.partner_id is not null then
    update public.students set partner_id = null where id = old.partner_id and partner_id = new.id;
  end if;
  if new.partner_id is not null then
    update public.students set partner_id = null where partner_id = new.partner_id and id <> new.id;
    update public.students set partner_id = new.id where id = new.partner_id and partner_id is distinct from new.id;
  end if;
  return new;
end $$;

create trigger students_partner_sync after update of partner_id on public.students
  for each row when (new.partner_id is distinct from old.partner_id)
  execute function public.students_partner_sync();

-- A private lesson that took place (or was missed and is charged anyway).
-- price and trainer_pay are kept as they were on the day.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete restrict,
  held_on date not null default current_date,
  minutes int not null check (minutes > 0),
  status text not null default 'done' check (status in ('done', 'no_show', 'late_cancel')),
  price numeric(10, 2) not null check (price >= 0),
  trainer_pay numeric(10, 2) not null check (trainer_pay >= 0),
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.lesson_students (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete restrict,
  unique (lesson_id, student_id)
);

-- A lesson's charges hang on it: deleting the lesson removes them, unless a
-- payment already covers one. "day" is the date a one-off charge is for.
alter table public.charges add column lesson_id uuid references public.lessons (id) on delete cascade;
alter table public.charges add column day date;

-- Record a private lesson with its one or two students and their charges, all
-- or nothing. The price and the trainer's part come from the trainer's rate for
-- that length unless typed by hand; a couple pays half each.
-- l = {trainer_id, held_on, minutes, status, price, trainer_pay, note}
create function public.record_lesson(l jsonb, student_ids uuid[]) returns uuid
language plpgsql set search_path = '' as $$
declare
  lid uuid;
  n int := coalesce(array_length(student_ids, 1), 0);
  r public.trainer_rates;
  who text;
  total numeric;
  pay numeric;
  mins int := (l ->> 'minutes')::int;
  day date := coalesce(nullif(l ->> 'held_on', '')::date, current_date);
begin
  if n < 1 or n > 2 then
    raise exception 'a private lesson has one or two students';
  end if;
  select full_name into who from public.trainers where id = (l ->> 'trainer_id')::uuid;
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

  insert into public.lessons (trainer_id, held_on, minutes, status, price, trainer_pay, note)
  values ((l ->> 'trainer_id')::uuid, day, mins, coalesce(nullif(l ->> 'status', ''), 'done'), total, pay, coalesce(l ->> 'note', ''))
  returning id into lid;
  insert into public.lesson_students (lesson_id, student_id) select lid, s from unnest(student_ids) s;
  insert into public.charges (student_id, kind, day, description, list_amount, amount, lesson_id)
  select s, 'private', day, who || ' ' || mins || U&'\2032', round(total / n, 2), round(total / n, 2), lid
  from unnest(student_ids) s;
  return lid;
end $$;

-- Money given to a trainer.
create table public.trainer_payouts (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers (id) on delete restrict,
  paid_on date not null default current_date,
  amount numeric(10, 2) not null check (amount <> 0),
  comment text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- Per trainer: earned by lessons, already given, still to give.
create view public.trainer_balances with (security_invoker = true) as
select x.trainer_id, x.earned, x.paid, x.earned - x.paid as owed
from (
  select t.id as trainer_id,
    coalesce((select sum(l.trainer_pay) from public.lessons l where l.trainer_id = t.id), 0) as earned,
    coalesce((select sum(p.amount) from public.trainer_payouts p where p.trainer_id = t.id), 0) as paid
  from public.trainers t
) x;

-- Money the studio spent. Always says what for.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  amount numeric(10, 2) not null check (amount > 0),
  comment text not null check (length(trim(comment)) > 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- Access: staff only, and every change is logged.
do $$
declare t text;
begin
  foreach t in array array['trainers', 'trainer_rates', 'lessons', 'lesson_students', 'trainer_payouts', 'expenses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "staff only" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create trigger log_change after insert or update or delete on public.%I for each row execute function public.log_change()', t);
  end loop;
end $$;

revoke all on public.trainer_balances from anon, authenticated;
grant select on public.trainer_balances to authenticated;
