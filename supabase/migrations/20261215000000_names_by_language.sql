-- Names in the reader's language (owner, 2026-11-20): Hebrew screens show the
-- Hebrew name; Russian and English screens the English name when there is one.
-- The screens choose; these two functions now also send the English names.
--   family_receipt(): the family's own payment confirmation (clients and
--     students carry full_name_en, like the CRM's confirmation page reads);
--   trainer_lessons(): students_en next to students (the same list with
--     English names where filled, Hebrew otherwise; a guest as typed).
-- ASCII only.

create or replace function public.family_receipt(pid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'number', p.number, 'paid_on', p.paid_on, 'amount', p.amount, 'method', p.method,
    'cheque_number', p.cheque_number, 'cheque_bank', p.cheque_bank, 'cheque_date', p.cheque_date,
    'paper_doc', p.paper_doc, 'comment', p.comment, 'voided', p.voided, 'payer_name', p.payer_name, 'what', p.what,
    'clients', jsonb_build_object('id', c.id, 'full_name', c.full_name, 'full_name_en', c.full_name_en, 'phone', c.phone, 'lang', c.lang),
    'payment_lines', coalesce((select jsonb_agg(jsonb_build_object('amount', l.amount, 'charges', jsonb_build_object(
        'kind', ch.kind, 'description', ch.description, 'month', ch.month, 'day', ch.day, 'comment', ch.comment,
        'students', jsonb_build_object('full_name', s.full_name, 'full_name_en', s.full_name_en))))
      from public.payment_lines l join public.charges ch on ch.id = l.charge_id join public.students s on s.id = ch.student_id
      where l.payment_id = p.id), '[]'),
    'business', coalesce((select value from public.settings where id = 'business'), '{}'))
  from public.payments p join public.clients c on c.id = p.client_id
  where p.id = pid and c.id = public.my_family() and c.approved;
$$;

drop function public.trainer_lessons(date, date);
create function public.trainer_lessons(d1 date, d2 date)
returns table (
  id uuid, held_on date, start_time time, minutes int, hall text, status text,
  price numeric, trainer_pay numeric, note text, students text, request jsonb, students_en text
)
language sql stable security definer set search_path = '' as $$
  select l.id, l.held_on, l.start_time, l.minutes, l.hall, l.status, l.price, l.trainer_pay, l.note,
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
revoke all on function public.trainer_lessons(date, date) from public, anon;
grant execute on function public.trainer_lessons(date, date) to authenticated;
