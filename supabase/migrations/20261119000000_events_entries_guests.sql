-- One-time groups (master classes), one-time entries, and money from people
-- who are not clients (owner, 2026-11-13).
--   * events: a one-off class on the schedule, with a price per entry.
--   * entries: one person coming once - to an event or to a regular group
--     class on a date. A client's student gets it on their account (a charge);
--     a guest is just a name, and pays on the spot.
--   * payments may now come from someone who is not a client: a name instead of
--     a client, with what it was for - an entry or a hall rental.
-- ASCII only.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  held_on date not null,
  start_time time not null,
  minutes int not null check (minutes > 0),
  hall text not null default '',
  trainer_id uuid references public.trainers (id) on delete set null,
  price numeric(10, 2) not null default 0 check (price >= 0), -- per entry
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  held_on date not null,
  student_id uuid references public.students (id) on delete restrict,
  guest_name text not null default '',
  amount numeric(10, 2) not null check (amount >= 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint entry_to_event_or_group check ((event_id is not null) <> (group_id is not null)),
  constraint entry_by_student_or_guest check ((student_id is not null) <> (length(trim(guest_name)) > 0))
);

-- A student's entry is a charge on their account; it goes when the entry goes
-- (unless already paid, which stops the delete).
alter table public.charges add column entry_id uuid references public.entries (id) on delete cascade;

do $$
declare t text;
begin
  foreach t in array array['events', 'entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "staff only" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create trigger log_change after insert or update or delete on public.%I for each row execute function public.log_change()', t);
  end loop;
end $$;

-- Add an entry; for a student it also puts the amount on their account.
-- e = {event_id | group_id + held_on, student_id | guest_name, amount}
create function public.add_entry(e jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare
  eid uuid;
  label text;
  day date;
  sid uuid := nullif(e ->> 'student_id', '')::uuid;
  amt numeric := (e ->> 'amount')::numeric;
begin
  if nullif(e ->> 'event_id', '') is not null then
    select title, held_on into label, day from public.events where id = (e ->> 'event_id')::uuid;
  else
    select name into label from public.groups where id = (e ->> 'group_id')::uuid;
    day := (e ->> 'held_on')::date;
  end if;
  insert into public.entries (event_id, group_id, held_on, student_id, guest_name, amount)
  values (nullif(e ->> 'event_id', '')::uuid, nullif(e ->> 'group_id', '')::uuid, day, sid, coalesce(e ->> 'guest_name', ''), amt)
  returning id into eid;
  if sid is not null then
    insert into public.charges (student_id, kind, day, description, list_amount, amount, entry_id)
    values (sid, 'entry', day, label, amt, amt, eid);
  end if;
  return eid;
end $$;

-- Payments from people who are not clients.
alter table public.payments alter column client_id drop not null;
alter table public.payments add column payer_name text not null default '';
alter table public.payments add column what text not null default ''; -- what it was for, printed on the confirmation
alter table public.payments add column rental_id uuid references public.rentals (id) on delete restrict;
alter table public.payments add column entry_id uuid references public.entries (id) on delete restrict;
alter table public.payments add constraint payer_known check (client_id is not null or length(trim(payer_name)) > 0);

create or replace function public.payments_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if new.amount <> old.amount or new.client_id is distinct from old.client_id or new.number <> old.number
    or new.payer_name <> old.payer_name or new.rental_id is distinct from old.rental_id or new.entry_id is distinct from old.entry_id then
    raise exception 'a recorded payment cannot be changed: void it and record a new one';
  end if;
  if old.voided and not new.voided then
    raise exception 'a voided payment stays voided';
  end if;
  return new;
end $$;

-- record_payment again, now also for a payer who is not a client.
-- p = {client_id | payer_name, what, rental_id, entry_id, paid_on, method, amount, cheque_*, paper_doc, comment}
create or replace function public.record_payment(p jsonb, lines jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare pid uuid;
begin
  insert into public.payments (client_id, payer_name, what, rental_id, entry_id, paid_on, method, amount, cheque_number, cheque_bank, cheque_date, paper_doc, comment)
  values (
    nullif(p ->> 'client_id', '')::uuid, coalesce(p ->> 'payer_name', ''), coalesce(p ->> 'what', ''),
    nullif(p ->> 'rental_id', '')::uuid, nullif(p ->> 'entry_id', '')::uuid,
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
