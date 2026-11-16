-- Details typed once are kept (owner, 2026-11-16): an ID number, an address,
-- or an adult student's phone and email written in a form go into the
-- student's record when it has none yet, so the next forms show them as
-- fixed text instead of asking again. ASCII only.

create or replace function public.submit_student_form(tok uuid, f text, answers jsonb, lang text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  at timestamptz;
begin
  if not exists (select 1 from public.students s join public.clients c on c.id = s.client_id where s.form_token = tok and c.approved) then
    raise exception 'this link is not active';
  end if;
  at := public.submit_student_form_unchecked(tok, f, answers, lang);
  update public.students s set
    id_number = case when s.id_number = '' then public.clean(coalesce(answers ->> 's_id', answers ->> 'a_id'), 20) else s.id_number end,
    address = case when s.address = '' then public.clean(coalesce(answers ->> 's_address', answers ->> 'a_address'), 200) else s.address end,
    phone = case when s.phone = '' then public.clean(answers ->> 'a_phone', 30) else s.phone end,
    email = case when s.email = '' and coalesce(answers ->> 'a_email', '') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(public.clean(answers ->> 'a_email', 120)) else s.email end
  where s.form_token = tok;
  return at;
end $$;
