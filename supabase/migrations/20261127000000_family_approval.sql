-- A family that registers online waits for the admin (owner, 2026-11-14).
-- After the login and the account holder's details, the family sees "waiting
-- for the studio"; it cannot add students or send forms until staff approve it
-- (approve_family), or join it to the family already in the CRM (merge_client,
-- which approves too). Refusing (refuse_family) removes the online record and
-- switches the login off, so it cannot register again. ASCII only.

alter table public.clients add column approved boolean not null default true;

-- The first save of an online family now makes it wait; a switched-off login is refused.
create or replace function public.family_save(h jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  fam uuid := public.my_family();
  he text := public.clean(h ->> 'full_name', 120);
  en text := public.clean(h ->> 'full_name_en', 120);
  tel text := public.clean(h ->> 'phone', 30);
begin
  if me is null then raise exception 'sign in first'; end if;
  if not exists (select 1 from public.profiles where id = me and active) then raise exception 'this account is not allowed to register'; end if;
  if length(he) < 2 or length(en) < 2 then raise exception 'the name in Hebrew and in English is needed'; end if;
  if length(regexp_replace(tel, '\D', '', 'g')) < 9 then raise exception 'a phone number is needed'; end if;
  if coalesce(h ->> 'relation', '') not in ('parent', 'guardian', 'self', 'other') then raise exception 'say who you are for the students'; end if;
  if fam is null then
    if (select count(*) from public.clients where online and created_at > now() - interval '1 hour') >= 20 then
      raise exception 'too many registrations right now, try again later';
    end if;
    insert into public.clients (full_name, user_id, online, approved, email) values (he, me, true, false, coalesce((select email from auth.users where id = me), ''))
    returning id into fam;
  end if;
  update public.clients set full_name = he, full_name_en = en, phone = tel,
    birth_date = nullif(h ->> 'birth_date', '')::date, address = public.clean(h ->> 'address', 200), relation = h ->> 'relation'
  where id = fam;
  return fam;
end $$;

-- Students and forms only once the family is let in.
create function public.family_approved() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select approved from public.clients where user_id = (select auth.uid())), false);
$$;

create or replace function public.family_me() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when c.id is null then null else jsonb_build_object(
    'approved', c.approved,
    'holder', jsonb_build_object('full_name', c.full_name, 'full_name_en', c.full_name_en, 'phone', c.phone, 'email', c.email,
      'birth_date', c.birth_date, 'address', c.address, 'relation', c.relation),
    'students', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'full_name', s.full_name, 'full_name_en', s.full_name_en, 'birth_date', s.birth_date, 'phone', s.phone,
        'email', s.email, 'address', s.address, 'id_number', s.id_number, 'relation', s.relation, 'is_holder', s.is_holder,
        'token', s.form_token, 'needed', public.forms_for(s.birth_date), 'forms', public.form_states(s.id))
        order by s.created_at)
      from public.students s where s.client_id = c.id and not s.archived and c.approved), '[]'))
  end
  from (select 1) x left join public.clients c on c.id = public.my_family();
$$;

-- The guard goes in front of the two that add things.
alter function public.family_save_student(uuid, jsonb) rename to family_save_student_unchecked;
revoke all on function public.family_save_student_unchecked(uuid, jsonb) from public, anon, authenticated;
create function public.family_save_student(sid uuid, s jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if public.my_family() is not null and not public.family_approved() then
    raise exception 'the studio has not approved this registration yet';
  end if;
  return public.family_save_student_unchecked(sid, s);
end $$;

create or replace function public.student_by_token(tok uuid) returns jsonb
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
  where s.form_token = tok and not s.archived and c.approved;
$$;

alter function public.submit_student_form(uuid, text, jsonb, text) rename to submit_student_form_unchecked;
revoke all on function public.submit_student_form_unchecked(uuid, text, jsonb, text) from public, anon, authenticated;
create function public.submit_student_form(tok uuid, f text, answers jsonb, lang text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.students s join public.clients c on c.id = s.client_id where s.form_token = tok and c.approved) then
    raise exception 'this link is not active';
  end if;
  return public.submit_student_form_unchecked(tok, f, answers, lang);
end $$;

-- Staff decide.
create function public.approve_family(cid uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  update public.clients set approved = true, online = false where id = cid;
end $$;

create function public.refuse_family(cid uuid) returns void
language plpgsql set search_path = '' as $$
declare who uuid;
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  select user_id into who from public.clients where id = cid and online;
  if not found then raise exception 'only an online registration can be refused'; end if;
  delete from public.students where client_id = cid; -- refused if anything was charged
  delete from public.clients where id = cid;
  if who is not null then
    update public.profiles set active = false where id = who and roles = '{}';
  end if;
end $$;

-- Joining to a family already in the CRM lets it in as well.
create or replace function public.merge_client(from_id uuid, into_id uuid) returns void
language plpgsql set search_path = '' as $$
declare a public.clients;
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  select * into a from public.clients where id = from_id;
  if a.id is null or from_id = into_id or not exists (select 1 from public.clients where id = into_id) then raise exception 'no such client'; end if;
  update public.students set client_id = into_id where client_id = from_id;
  delete from public.clients where id = from_id;
  update public.clients t set user_id = a.user_id, online = false, approved = true,
    full_name_en = case when t.full_name_en = '' then a.full_name_en else t.full_name_en end,
    phone = case when t.phone = '' then a.phone else t.phone end,
    email = case when t.email = '' then a.email else t.email end,
    address = case when t.address = '' then a.address else t.address end,
    birth_date = coalesce(t.birth_date, a.birth_date),
    relation = a.relation
  where t.id = into_id;
end $$;

revoke all on function public.family_approved(), public.family_save_student(uuid, jsonb), public.submit_student_form(uuid, text, jsonb, text),
  public.approve_family(uuid), public.refuse_family(uuid) from public, anon;
grant execute on function public.family_save_student(uuid, jsonb), public.approve_family(uuid), public.refuse_family(uuid) to authenticated;
grant execute on function public.submit_student_form(uuid, text, jsonb, text) to anon, authenticated;
