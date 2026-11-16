-- Stage 4, money for parents (owner, 2026-11-16).
--   family_money()      the family's balance, its charges of the last year with
--                       what is still owed on each, and its payments;
--   family_receipt(id)  one of its payments as the confirmation the CRM prints;
--   debt_reminders()    run every morning by pg_cron: 3 days before the payment
--                       day "X to pay by day N", 7 days after it "X still
--                       unpaid" - only to families that owe, in their language.
-- The payment day and the two offsets are the setting 'payment_reminder'
-- ({"day": 1, "before": 3, "after": 7}), the same days as the app's banner.
-- ASCII only; texts are U&'' escapes.

insert into public.settings (id, value) values ('payment_reminder', '{"day": 1, "before": 3, "after": 7}')
on conflict (id) do nothing;

create function public.family_money() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when c.id is null or not c.approved then null else jsonb_build_object(
    'balance', b.balance, 'credit', b.credit,
    'charges', coalesce((select jsonb_agg(jsonb_build_object(
        'id', ch.id, 'kind', ch.kind, 'description', ch.description, 'month', ch.month, 'day', ch.day,
        'comment', ch.comment, 'amount', ch.amount, 'owed', cb.owed, 'student', s.full_name)
        order by coalesce(ch.month, ch.day) desc, s.full_name)
      from public.charges ch
      join public.students s on s.id = ch.student_id
      join public.charge_balances cb on cb.charge_id = ch.id
      where s.client_id = c.id and coalesce(ch.month, ch.day, ch.created_at::date) > (now() at time zone 'Asia/Jerusalem')::date - 400), '[]'),
    'payments', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'number', p.number, 'paid_on', p.paid_on, 'amount', p.amount, 'method', p.method, 'voided', p.voided)
        order by p.number desc)
      from public.payments p where p.client_id = c.id), '[]'))
  end
  from (select 1) x
  left join public.clients c on c.id = public.my_family()
  left join public.client_balances b on b.client_id = c.id;
$$;

-- The same shape as the CRM's confirmation page reads, for the family's own payments only.
create function public.family_receipt(pid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'number', p.number, 'paid_on', p.paid_on, 'amount', p.amount, 'method', p.method,
    'cheque_number', p.cheque_number, 'cheque_bank', p.cheque_bank, 'cheque_date', p.cheque_date,
    'paper_doc', p.paper_doc, 'comment', p.comment, 'voided', p.voided, 'payer_name', p.payer_name, 'what', p.what,
    'clients', jsonb_build_object('id', c.id, 'full_name', c.full_name, 'phone', c.phone, 'lang', c.lang),
    'payment_lines', coalesce((select jsonb_agg(jsonb_build_object('amount', l.amount, 'charges', jsonb_build_object(
        'kind', ch.kind, 'description', ch.description, 'month', ch.month, 'day', ch.day, 'comment', ch.comment,
        'students', jsonb_build_object('full_name', s.full_name))))
      from public.payment_lines l join public.charges ch on ch.id = l.charge_id join public.students s on s.id = ch.student_id
      where l.payment_id = p.id), '[]'),
    'business', coalesce((select value from public.settings where id = 'business'), '{}'))
  from public.payments p join public.clients c on c.id = p.client_id
  where p.id = pid and c.id = public.my_family() and c.approved;
$$;

revoke all on function public.family_money(), public.family_receipt(uuid) from public, anon;
grant execute on function public.family_money(), public.family_receipt(uuid) to authenticated;

create function public.debt_reminders(on_day date default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  d date := coalesce(on_day, (now() at time zone 'Asia/Jerusalem')::date);
  cfg jsonb := coalesce((select value from public.settings where id = 'payment_reminder'), '{"day": 1, "before": 3, "after": 7}');
  pay_day int := least(greatest(coalesce((cfg ->> 'day')::int, 1), 1), 28);
  due date;
  kind text;
  r record;
  amt text;
  sent int := 0;
begin
  -- The payment day this run is about: this month's or next month's.
  foreach due in array array[make_date(extract(year from d)::int, extract(month from d)::int, pay_day),
                             (make_date(extract(year from d)::int, extract(month from d)::int, pay_day) + interval '1 month')::date,
                             (make_date(extract(year from d)::int, extract(month from d)::int, pay_day) - interval '1 month')::date] loop
    kind := case when d = due - coalesce((cfg ->> 'before')::int, 3) then 'before'
                 when d = due + coalesce((cfg ->> 'after')::int, 7) then 'after' end;
    exit when kind is not null;
  end loop;
  if kind is null then return 0; end if;
  for r in
    select c.id, b.balance from public.clients c join public.client_balances b on b.client_id = c.id
    where c.user_id is not null and c.approved and not c.archived and b.balance > 0
  loop
    amt := trim(to_char(r.balance, 'FM999999990.##'));
    amt := rtrim(amt, '.');
    perform public.push_families(array(select s.id from public.students s where s.client_id = r.id),
      case kind when 'before' then jsonb_build_object('he', jsonb_build_array(U&'\05EA\05D6\05DB\05D5\05E8\05EA \05EA\05E9\05DC\05D5\05DD', replace(replace(U&'\05DC\05EA\05E9\05DC\05D5\05DD {a} \20AA \05E2\05D3 \05D4-{d} \05D1\05D7\05D5\05D3\05E9. \05D4\05E4\05E8\05D8\05D9\05DD \05D1\05D0\05D6\05D5\05E8 \05D4\05D0\05D9\05E9\05D9.', '{a}', amt), '{d}', pay_day::text)), 'ru', jsonb_build_array(U&'\041D\0430\043F\043E\043C\0438\043D\0430\043D\0438\0435 \043E\0431 \043E\043F\043B\0430\0442\0435', replace(replace(U&'\041A \043E\043F\043B\0430\0442\0435 {a} \20AA \0434\043E {d} \0447\0438\0441\043B\0430. \041F\043E\0434\0440\043E\0431\043D\043E\0441\0442\0438 \2014 \0432 \043A\0430\0431\0438\043D\0435\0442\0435.', '{a}', amt), '{d}', pay_day::text)), 'en', jsonb_build_array('Payment reminder', replace(replace(U&'{a} \20AA to pay by day {d} of the month. Details in your account.', '{a}', amt), '{d}', pay_day::text))) else jsonb_build_object('he', jsonb_build_array(U&'\05D4\05EA\05E9\05DC\05D5\05DD \05D1\05D0\05D9\05D7\05D5\05E8', replace(replace(U&'\05D8\05E8\05DD \05E9\05D5\05DC\05DE\05D5 {a} \20AA. \05E0\05D0 \05DC\05D4\05E1\05D3\05D9\05E8 \05D0\05EA \05D4\05EA\05E9\05DC\05D5\05DD. \05D4\05E4\05E8\05D8\05D9\05DD \05D1\05D0\05D6\05D5\05E8 \05D4\05D0\05D9\05E9\05D9.', '{a}', amt), '{d}', pay_day::text)), 'ru', jsonb_build_array(U&'\041E\043F\043B\0430\0442\0430 \043F\0440\043E\0441\0440\043E\0447\0435\043D\0430', replace(replace(U&'\041D\0435 \043E\043F\043B\0430\0447\0435\043D\043E {a} \20AA. \041F\043E\0436\0430\043B\0443\0439\0441\0442\0430, \043E\043F\043B\0430\0442\0438\0442\0435. \041F\043E\0434\0440\043E\0431\043D\043E\0441\0442\0438 \2014 \0432 \043A\0430\0431\0438\043D\0435\0442\0435.', '{a}', amt), '{d}', pay_day::text)), 'en', jsonb_build_array('Payment overdue', replace(replace(U&'{a} \20AA is still unpaid. Please pay. Details in your account.', '{a}', amt), '{d}', pay_day::text))) end);
    sent := sent + 1;
  end loop;
  return sent;
end $$;
revoke all on function public.debt_reminders(date) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('etude-debt-reminders', '0 7 * * *', 'select public.debt_reminders()');
  end if;
end $$;
