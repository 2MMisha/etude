-- Forms are renewed every 12 months (owner, 2026-11-14): a form sent more
-- than a year ago counts as "needs updating" (decided in src/crm/forms.ts,
-- stateOf), and filling it again starts from the previous answers - only the
-- confirmations and the signature are asked afresh. So the student's page now
-- also returns the newest answers of each form ("last"), to prefill them.
-- It is the same link the family filled the forms through. ASCII only.

create or replace function public.student_by_token(tok uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'full_name', s.full_name, 'full_name_en', s.full_name_en, 'birth_date', s.birth_date, 'adult', public.adult(s.birth_date),
    'id_number', s.id_number, 'address', s.address, 'phone', s.phone, 'email', s.email, 'is_holder', s.is_holder,
    'holder', jsonb_build_object('full_name', c.full_name, 'full_name_en', c.full_name_en, 'phone', c.phone, 'email', c.email, 'relation', c.relation),
    'needed', public.forms_for(s.birth_date), 'forms', public.form_states(s.id),
    'last', coalesce((select jsonb_object_agg(f.form, f.answers) from (
        select distinct on (form) form, answers from public.student_forms where student_id = s.id order by form, submitted_at desc
      ) f), '{}'),
    'groups', coalesce((select jsonb_agg(g.name order by g.name) from public.groups g where not g.archived), '[]'),
    'docs', public.public_docs()
  )
  from public.students s join public.clients c on c.id = s.client_id
  where s.form_token = tok and not s.archived and c.approved;
$$;
