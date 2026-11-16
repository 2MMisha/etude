-- Everything a form says about the student lands in the student's card
-- (owner, 2026-11-16): also the date of birth (which decides adult or minor,
-- and so which forms are needed) and the name in English, when the card has
-- none. A student added in the CRM with only a name gets the rest from the
-- first form, and the next forms then show it as fixed text. Forms already
-- sent are copied over once below. ASCII only.

create function public.student_from_answers(sid uuid, answers jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  born text := coalesce(answers ->> 's_birth', answers ->> 'a_birth');
begin
  update public.students s set
    birth_date = case when s.birth_date is null and born ~ '^\d{4}-\d{2}-\d{2}$' then born::date else s.birth_date end,
    full_name_en = case when s.full_name_en = '' then public.clean(answers -> 's_name' ->> 'en', 120) else s.full_name_en end,
    id_number = case when s.id_number = '' then public.clean(coalesce(answers ->> 's_id', answers ->> 'a_id'), 20) else s.id_number end,
    address = case when s.address = '' then public.clean(coalesce(answers ->> 's_address', answers ->> 'a_address'), 200) else s.address end,
    phone = case when s.phone = '' then public.clean(answers ->> 'a_phone', 30) else s.phone end,
    email = case when s.email = '' and coalesce(answers ->> 'a_email', '') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(public.clean(answers ->> 'a_email', 120)) else s.email end
  where s.id = sid;
end $$;
revoke all on function public.student_from_answers(uuid, jsonb) from public, anon, authenticated;

create or replace function public.submit_student_form(tok uuid, f text, answers jsonb, lang text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  at timestamptz;
  sid uuid;
begin
  select s.id into sid from public.students s join public.clients c on c.id = s.client_id where s.form_token = tok and c.approved;
  if sid is null then
    raise exception 'this link is not active';
  end if;
  at := public.submit_student_form_unchecked(tok, f, answers, lang);
  perform public.student_from_answers(sid, answers);
  return at;
end $$;

-- Forms sent before this: oldest first, so the first answer given wins, as it would have.
select public.student_from_answers(student_id, answers) from public.student_forms order by submitted_at;
