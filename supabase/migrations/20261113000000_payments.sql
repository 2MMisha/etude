-- Stage 2: payments, what each one covered, balances and family credit.
-- Staff only. ASCII only, so it survives a copy-paste in any encoding.

create sequence public.payment_number_seq;

-- Money received from a client (or given back: a refund is a negative amount).
-- "number" is the confirmation number: handed out once, never reused.
-- A payment is never deleted or re-priced; a mistake is voided, with a reason.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.payment_number_seq'),
  client_id uuid not null references public.clients (id) on delete restrict,
  paid_on date not null default current_date,
  method text not null check (method in ('cash', 'transfer', 'bit', 'cheque', 'standing_order')),
  amount numeric(10, 2) not null check (amount <> 0),
  cheque_number text not null default '',
  cheque_bank text not null default '',
  cheque_date date,
  paper_doc text not null default '', -- number of the paper document, if one was written
  comment text not null default '',
  voided boolean not null default false,
  void_reason text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint refund_needs_comment check (amount > 0 or length(trim(comment)) > 0),
  constraint void_needs_reason check (not voided or length(trim(void_reason)) > 0)
);

-- Which charges a payment covered, and by how much. Whatever a payment has
-- beyond its lines is the family's credit.
create table public.payment_lines (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  charge_id uuid not null references public.charges (id) on delete restrict,
  amount numeric(10, 2) not null check (amount <> 0),
  unique (payment_id, charge_id)
);

-- The amount, the payer and the number of a recorded payment stay as they are.
create function public.payments_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if new.amount <> old.amount or new.client_id <> old.client_id or new.number <> old.number then
    raise exception 'a recorded payment cannot be changed: void it and record a new one';
  end if;
  if old.voided and not new.voided then
    raise exception 'a voided payment stays voided';
  end if;
  return new;
end $$;

create trigger payments_guard before update on public.payments
  for each row execute function public.payments_guard();

-- A line must belong to the payer's family, go the same way as the payment
-- (a refund line is negative), and never cover more than the payment holds or
-- the charge asks for.
create function public.payment_lines_guard() returns trigger
language plpgsql set search_path = '' as $$
declare p public.payments; c public.charges; used numeric; covered numeric;
begin
  select * into p from public.payments where id = new.payment_id;
  select * into c from public.charges where id = new.charge_id;
  if not exists (select 1 from public.students s where s.id = c.student_id and s.client_id = p.client_id) then
    raise exception 'this charge belongs to another client';
  end if;
  if sign(new.amount) <> sign(p.amount) then
    raise exception 'a line must have the same sign as its payment';
  end if;
  select coalesce(sum(abs(amount)), 0) into used from public.payment_lines where payment_id = new.payment_id;
  if used > abs(p.amount) then
    raise exception 'the lines add up to more than the payment';
  end if;
  select coalesce(sum(l.amount), 0) into covered
  from public.payment_lines l join public.payments x on x.id = l.payment_id
  where l.charge_id = new.charge_id and not x.voided;
  if covered > c.amount then
    raise exception 'this charge would be paid twice';
  end if;
  return new;
end $$;

create trigger payment_lines_guard after insert or update on public.payment_lines
  for each row execute function public.payment_lines_guard();

-- What is paid and still owed on every charge (voided payments don't count).
create view public.charge_balances with (security_invoker = true) as
select c.id as charge_id, c.student_id, c.amount,
  coalesce(sum(l.amount) filter (where not p.voided), 0) as paid,
  c.amount - coalesce(sum(l.amount) filter (where not p.voided), 0) as owed
from public.charges c
left join public.payment_lines l on l.charge_id = c.id
left join public.payments p on p.id = l.payment_id
group by c.id;

-- Per family: everything charged, everything paid, the difference (above zero
-- = owes, below zero = paid ahead), and the part of the payments not yet put
-- against a charge.
create view public.client_balances with (security_invoker = true) as
select x.client_id, x.charged, x.paid, x.charged - x.paid as balance, x.paid - x.allocated as credit
from (
  select cl.id as client_id,
    coalesce((select sum(c.amount) from public.charges c join public.students s on s.id = c.student_id where s.client_id = cl.id), 0) as charged,
    coalesce((select sum(p.amount) from public.payments p where p.client_id = cl.id and not p.voided), 0) as paid,
    coalesce((select sum(l.amount) from public.payment_lines l join public.payments p on p.id = l.payment_id where p.client_id = cl.id and not p.voided), 0) as allocated
  from public.clients cl
) x;

-- Record a payment and its lines together: both are saved or neither.
-- p = {client_id, paid_on, method, amount, cheque_number, cheque_bank, cheque_date, paper_doc, comment}
-- lines = [{charge_id, amount}, ...]
create function public.record_payment(p jsonb, lines jsonb) returns uuid
language plpgsql set search_path = '' as $$
declare pid uuid;
begin
  insert into public.payments (client_id, paid_on, method, amount, cheque_number, cheque_bank, cheque_date, paper_doc, comment)
  values (
    (p ->> 'client_id')::uuid, coalesce(nullif(p ->> 'paid_on', '')::date, current_date), p ->> 'method', (p ->> 'amount')::numeric,
    coalesce(p ->> 'cheque_number', ''), coalesce(p ->> 'cheque_bank', ''), nullif(p ->> 'cheque_date', '')::date,
    coalesce(p ->> 'paper_doc', ''), coalesce(p ->> 'comment', '')
  )
  returning id into pid;
  insert into public.payment_lines (payment_id, charge_id, amount)
  select pid, (l ->> 'charge_id')::uuid, (l ->> 'amount')::numeric
  from jsonb_array_elements(coalesce(lines, '[]'::jsonb)) l;
  return pid;
end $$;

-- Put a family's credit against its unpaid charges: oldest payment first,
-- oldest charge first. Returns how much was used.
create function public.use_credit(client uuid) returns numeric
language plpgsql set search_path = '' as $$
declare pay record; ch record; take numeric; left_over numeric; total numeric := 0;
begin
  for pay in
    select p.id, p.amount - coalesce((select sum(l.amount) from public.payment_lines l where l.payment_id = p.id), 0) as spare
    from public.payments p
    where p.client_id = client and not p.voided and p.amount > 0
    order by p.paid_on, p.number
  loop
    left_over := pay.spare;
    for ch in
      select b.charge_id, b.owed
      from public.charge_balances b
      join public.charges c on c.id = b.charge_id
      join public.students s on s.id = b.student_id
      where s.client_id = client and b.owed > 0
        and not exists (select 1 from public.payment_lines l where l.payment_id = pay.id and l.charge_id = b.charge_id)
      order by c.month nulls last, c.created_at
    loop
      exit when left_over <= 0;
      take := least(left_over, ch.owed);
      insert into public.payment_lines (payment_id, charge_id, amount) values (pay.id, ch.charge_id, take);
      left_over := left_over - take;
      total := total + take;
    end loop;
  end loop;
  return total;
end $$;

-- Access: staff only; no deleting or re-pricing; every change is logged.
alter table public.payments enable row level security;
alter table public.payment_lines enable row level security;
revoke all on public.payments, public.payment_lines, public.charge_balances, public.client_balances from anon, authenticated;
revoke all on sequence public.payment_number_seq from anon, authenticated;
grant select, insert, update on public.payments to authenticated;
grant select, insert on public.payment_lines to authenticated;
grant usage on sequence public.payment_number_seq to authenticated;
grant select on public.charge_balances, public.client_balances to authenticated;

create policy "staff only" on public.payments for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff only" on public.payment_lines for all to authenticated using (public.is_staff()) with check (public.is_staff());

create trigger log_change after insert or update or delete on public.payments
  for each row execute function public.log_change();
create trigger log_change after insert or update or delete on public.payment_lines
  for each row execute function public.log_change();

-- The school's details printed on a confirmation; edited in /crm/ -> Settings.
insert into public.settings (id, value)
values ('business', '{"name": "ETUDE Dance School", "address": "Rothschild 49, Rishon LeZion", "phone": "", "number": ""}')
on conflict (id) do nothing;
