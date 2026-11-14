-- Family registration (owner, 2026-11-14). A family creates its own login on
-- /family/, fills in the account holder's details, adds its students and fills
-- each student's registration forms (appendices 1, 2, 3 for minors, 4, 6, 7).
-- Every family, old and new, registers this way; an online registration of a
-- family already in the CRM is joined to it by staff (merge_client).
--
-- The family never reads a table. It calls functions that resolve it through
-- clients.user_id = auth.uid(). A student's forms are reached through that
-- student's own link (students.form_token), also without a login, so the link
-- can go to the other parent or to an adult student. The link shows the
-- student's name and which forms are done - never the answers. ASCII only.

-- Names: the CRM keeps full_name (Hebrew) and now also the name in English.
alter table public.clients
  add column full_name_en text not null default '',
  add column birth_date date,
  add column relation text not null default '',
  add column user_id uuid unique references auth.users (id) on delete set null,
  add column online boolean not null default false; -- registered online, not yet checked by staff

alter table public.students
  add column full_name_en text not null default '',
  add column id_number text not null default '',
  add column address text not null default '',
  add column email text not null default '',
  add column relation text not null default '',
  add column is_holder boolean not null default false,
  add column form_token uuid not null unique default gen_random_uuid();

-- One sent form. Sending again (an update) adds a row; the newest counts.
create table public.student_forms (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  form text not null check (form in ('f1', 'f2', 'f3', 'f4', 'f6', 'f7')),
  answers jsonb not null,
  signed_by text not null default '',
  lang text not null default 'he',
  submitted_at timestamptz not null default now(),
  needs_update boolean not null default false, -- staff asks the family to send it again
  clarified boolean not null default false     -- staff has answered what the family asked about
);
create index on public.student_forms (student_id, form, submitted_at desc);

-- Staff comments and contact history, per student.
create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['student_forms', 'student_notes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "staff only" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create trigger log_change after insert or update or delete on public.%I for each row execute function public.log_change()', t);
  end loop;
end $$;

-- The school's documents shown on the forms (offer, provider details, terms,
-- prices): typed in Settings. Empty until then.
insert into public.settings (id, value) values
  ('doc_offer', '""'), ('doc_provider', '""'), ('doc_terms', '""'), ('doc_prices', '""')
on conflict (id) do nothing;

-- Tidy a piece of text from a form: trimmed, single spaces, at most n characters.
create function public.clean(x text, n int) returns text
language sql immutable set search_path = '' as $$
  select left(btrim(regexp_replace(coalesce(x, ''), '\s+', ' ', 'g')), n);
$$;

create function public.adult(b date) returns boolean
language sql stable set search_path = '' as $$
  select b is not null and b <= ((now() at time zone 'Asia/Jerusalem')::date - interval '18 years')::date;
$$;

-- The forms a student needs: appendix 3 only while a minor.
create function public.forms_for(b date) returns text[]
language sql stable set search_path = '' as $$
  select case when public.adult(b) then array['f1', 'f2', 'f4', 'f6', 'f7'] else array['f1', 'f2', 'f3', 'f4', 'f6', 'f7'] end;
$$;

-- What a student's page and the family page show: the newest of each form,
-- its date and the flags. No answers.
create function public.form_states(sid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(f.form, jsonb_build_object(
      'at', f.submitted_at, 'signed_by', f.signed_by, 'needs_update', f.needs_update,
      'ask', f.answers ->> '_ask', 'clarified', f.clarified)), '{}')
  from (
    select distinct on (form) * from public.student_forms where student_id = sid order by form, submitted_at desc
  ) f;
$$;

-- The family's own record, if it has one yet.
create function public.my_family() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.clients where user_id = (select auth.uid());
$$;

create function public.family_me() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when c.id is null then null else jsonb_build_object(
    'holder', jsonb_build_object('full_name', c.full_name, 'full_name_en', c.full_name_en, 'phone', c.phone, 'email', c.email,
      'birth_date', c.birth_date, 'address', c.address, 'relation', c.relation),
    'students', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'full_name', s.full_name, 'full_name_en', s.full_name_en, 'birth_date', s.birth_date, 'phone', s.phone,
        'email', s.email, 'address', s.address, 'id_number', s.id_number, 'relation', s.relation, 'is_holder', s.is_holder,
        'token', s.form_token, 'needed', public.forms_for(s.birth_date), 'forms', public.form_states(s.id))
        order by s.created_at)
      from public.students s where s.client_id = c.id and not s.archived), '[]'))
  end
  from (select 1) x left join public.clients c on c.id = public.my_family();
$$;

-- The account holder's details. The first call makes the family's record.
-- h = {full_name, full_name_en, phone, birth_date, address, relation}
create function public.family_save(h jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  fam uuid := public.my_family();
  he text := public.clean(h ->> 'full_name', 120);
  en text := public.clean(h ->> 'full_name_en', 120);
  tel text := public.clean(h ->> 'phone', 30);
begin
  if me is null then raise exception 'sign in first'; end if;
  if length(he) < 2 or length(en) < 2 then raise exception 'the name in Hebrew and in English is needed'; end if;
  if length(regexp_replace(tel, '\D', '', 'g')) < 9 then raise exception 'a phone number is needed'; end if;
  if coalesce(h ->> 'relation', '') not in ('parent', 'guardian', 'self', 'other') then raise exception 'say who you are for the students'; end if;
  if fam is null then
    -- A brake on a script making families: 20 new online families an hour, for the whole school.
    if (select count(*) from public.clients where online and created_at > now() - interval '1 hour') >= 20 then
      raise exception 'too many registrations right now, try again later';
    end if;
    insert into public.clients (full_name, user_id, online, email) values (he, me, true, coalesce((select email from auth.users where id = me), ''))
    returning id into fam;
  end if;
  update public.clients set full_name = he, full_name_en = en, phone = tel,
    birth_date = nullif(h ->> 'birth_date', '')::date, address = public.clean(h ->> 'address', 200), relation = h ->> 'relation'
  where id = fam;
  return fam;
end $$;

-- Add (sid null) or correct a student of one's own family. Returns the student's id.
-- s = {full_name, full_name_en, birth_date, is_holder, relation, id_number, address, phone, email}
create function public.family_save_student(sid uuid, s jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  fam uuid := public.my_family();
  he text := public.clean(s ->> 'full_name', 120);
  en text := public.clean(s ->> 'full_name_en', 120);
  born date := nullif(s ->> 'birth_date', '')::date;
  holder boolean := coalesce((s ->> 'is_holder')::boolean, false);
  rel text := case when holder then '' else coalesce(s ->> 'relation', '') end;
  mail text := lower(public.clean(s ->> 'email', 120));
  kept uuid;
begin
  if fam is null then raise exception 'fill in your own details first'; end if;
  if length(he) < 2 or length(en) < 2 then raise exception 'the name in Hebrew and in English is needed'; end if;
  if born is null or born > (now() at time zone 'Asia/Jerusalem')::date or born < date '1920-01-01' then raise exception 'a date of birth is needed'; end if;
  if not holder and rel not in ('son', 'daughter', 'spouse', 'sibling', 'relative', 'other') then raise exception 'say who the student is to you'; end if;
  if mail <> '' and mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'that email does not look right'; end if;
  if sid is null then
    if (select count(*) from public.students where client_id = fam) >= 12 then raise exception 'too many students in one family'; end if;
    insert into public.students (client_id, full_name) values (fam, he) returning id into kept;
  else
    select id into kept from public.students where id = sid and client_id = fam;
    if kept is null then raise exception 'not a student of your family'; end if;
  end if;
  update public.students set full_name = he, full_name_en = en, birth_date = born, is_holder = holder, relation = rel,
    id_number = public.clean(s ->> 'id_number', 20), address = public.clean(s ->> 'address', 200),
    phone = public.clean(s ->> 'phone', 30), email = mail
  where id = kept;
  return kept;
end $$;

-- The documents, for the account screen (before there is a login) and the forms.
create function public.public_docs() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(x.id, x.value), '{}') from public.settings x where x.id like 'doc\_%';
$$;

-- A student's page, opened by its link. What the forms are filled in with
-- before anyone types: the names and contacts already known. Plus the lists
-- and texts the forms show (groups, documents).
create function public.student_by_token(tok uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'full_name', s.full_name, 'full_name_en', s.full_name_en, 'birth_date', s.birth_date, 'adult', public.adult(s.birth_date),
    'id_number', s.id_number, 'address', s.address, 'phone', s.phone, 'email', s.email, 'is_holder', s.is_holder,
    'holder', jsonb_build_object('full_name', c.full_name, 'full_name_en', c.full_name_en, 'phone', c.phone, 'email', c.email, 'relation', c.relation),
    'needed', public.forms_for(s.birth_date), 'forms', public.form_states(s.id),
    'groups', coalesce((select jsonb_agg(g.name order by g.name) from public.groups g where not g.archived), '[]'),
    'docs', public.public_docs()
  )
  from public.students s join public.clients c on c.id = s.client_id
  where s.form_token = tok and not s.archived;
$$;

-- Send one form for the student whose link this is. The page checks every
-- answer before it sends; here: the form applies to this student, a name of
-- who confirms, sizes, and a brake on repeats.
create function public.submit_student_form(tok uuid, f text, answers jsonb, lang text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  s public.students;
  signer text := public.clean(answers ->> '_signed_by', 120);
  at timestamptz;
begin
  select * into s from public.students where form_token = tok and not archived;
  if not found then raise exception 'this link is not active'; end if;
  if not (f = any (public.forms_for(s.birth_date))) then raise exception 'this form is not needed for this student'; end if;
  if jsonb_typeof(answers) <> 'object' or length(answers::text) > 20000 then raise exception 'the form is too long'; end if;
  if length(signer) < 2 then raise exception 'the name of who confirms is needed'; end if;
  if (select count(*) from public.student_forms where student_id = s.id and submitted_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many forms sent, try again later';
  end if;
  insert into public.student_forms (student_id, form, answers, signed_by, lang)
  values (s.id, f, answers, signer, case when lang in ('he', 'ru', 'en') then lang else 'he' end)
  returning submitted_at into at;
  return at;
end $$;

-- Staff: an online registration belongs to a family already in the CRM.
-- The login, the details the family typed (where the CRM had none) and the
-- students move over; the online record goes. A student who is the same
-- person as one already there is joined first with merge_student.
create function public.merge_student(from_id uuid, into_id uuid) returns void
language plpgsql set search_path = '' as $$
declare
  a public.students;
  tok uuid;
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  select * into a from public.students where id = from_id;
  if a.id is null or from_id = into_id or not exists (select 1 from public.students where id = into_id) then raise exception 'no such student'; end if;
  update public.student_forms set student_id = into_id where student_id = from_id;
  update public.student_notes set student_id = into_id where student_id = from_id;
  tok := a.form_token;
  delete from public.students where id = from_id; -- refused if the online record already has charges or lessons
  update public.students t set
    full_name_en = case when t.full_name_en = '' then a.full_name_en else t.full_name_en end,
    birth_date = coalesce(t.birth_date, a.birth_date),
    id_number = case when t.id_number = '' then a.id_number else t.id_number end,
    address = case when t.address = '' then a.address else t.address end,
    phone = case when t.phone = '' then a.phone else t.phone end,
    email = case when t.email = '' then a.email else t.email end,
    relation = a.relation, is_holder = a.is_holder, form_token = tok -- the family's link keeps working
  where t.id = into_id;
end $$;

create function public.merge_client(from_id uuid, into_id uuid) returns void
language plpgsql set search_path = '' as $$
declare a public.clients;
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  select * into a from public.clients where id = from_id;
  if a.id is null or from_id = into_id or not exists (select 1 from public.clients where id = into_id) then raise exception 'no such client'; end if;
  update public.students set client_id = into_id where client_id = from_id;
  delete from public.clients where id = from_id; -- refused if the online record already has payments
  update public.clients t set user_id = a.user_id, online = false,
    full_name_en = case when t.full_name_en = '' then a.full_name_en else t.full_name_en end,
    phone = case when t.phone = '' then a.phone else t.phone end,
    email = case when t.email = '' then a.email else t.email end,
    address = case when t.address = '' then a.address else t.address end,
    birth_date = coalesce(t.birth_date, a.birth_date),
    relation = a.relation
  where t.id = into_id;
end $$;

revoke all on function
  public.form_states(uuid), public.my_family(), public.family_me(), public.family_save(jsonb),
  public.family_save_student(uuid, jsonb), public.student_by_token(uuid), public.submit_student_form(uuid, text, jsonb, text),
  public.merge_student(uuid, uuid), public.merge_client(uuid, uuid)
from public, anon;
grant execute on function public.family_me(), public.family_save(jsonb), public.family_save_student(uuid, jsonb),
  public.merge_student(uuid, uuid), public.merge_client(uuid, uuid)
to authenticated;
grant execute on function public.public_docs() to anon, authenticated;
grant execute on function public.student_by_token(uuid), public.submit_student_form(uuid, text, jsonb, text) to anon, authenticated;
