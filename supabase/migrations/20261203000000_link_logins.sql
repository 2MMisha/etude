-- A login follows what it belongs to (owner, 2026-11-16). Before, a family that
-- registered had a login with no name and no role, and a trainer linked in
-- Settings still needed the Trainer role set by hand in Accounts. Now:
--   - a login linked to a client (clients.user_id: the family's own sign-up, or
--     staff joining an online registration to a client) gets the Client role
--     and the client's name;
--   - a login linked to a trainer (trainers.user_id, set in Settings) gets the
--     Trainer role and, if it has none, the trainer's name.
-- A name a login already has from staff (an owner or admin) is not overwritten.
-- Roles are only added, never taken away, by this. Existing links are brought
-- in line once below. ASCII only.

-- Changes made by these links, not by a person: profiles_guard lets them through.
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or current_setting('etude.linking', true) = 'on' then return new; end if;
  if new.email <> old.email then
    raise exception 'the login email is changed through the account, not the profile';
  end if;
  if not public.is_staff() and (new.roles <> old.roles or new.active <> old.active) then
    raise exception 'only staff can change roles or deactivate an account';
  end if;
  if not public.has_role('owner') and ('owner' = any (old.roles) or 'owner' = any (new.roles)) then
    raise exception 'only the owner can change an owner account';
  end if;
  if old.active and 'owner' = any (old.roles) and not (new.active and 'owner' = any (new.roles))
     and not exists (select 1 from public.profiles p where p.id <> old.id and p.active and 'owner' = any (p.roles)) then
    raise exception 'the school must keep at least one owner';
  end if;
  return new;
end $$;

-- Give a login a role (if missing) and a name (if it has none, or it is only a client).
create function public.link_login(uid uuid, r public.app_role, name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if uid is null then return; end if;
  perform set_config('etude.linking', 'on', true);
  update public.profiles p set
    roles = case when r = any (p.roles) then p.roles else p.roles || r end,
    full_name = case
      when btrim(coalesce(name, '')) = '' then p.full_name
      when p.full_name = '' or p.roles <@ array['client']::public.app_role[] then btrim(name)
      else p.full_name end
  where p.id = uid;
  perform set_config('etude.linking', '', true);
end $$;
revoke all on function public.link_login(uuid, public.app_role, text) from public, anon, authenticated;

create function public.client_login_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.link_login(new.user_id, 'client', new.full_name);
  return null;
end $$;
create trigger client_login_sync after insert or update of user_id, full_name on public.clients
  for each row when (new.user_id is not null) execute function public.client_login_sync();

create function public.trainer_login_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.link_login(new.user_id, 'trainer', new.full_name);
  return null;
end $$;
create trigger trainer_login_sync after insert or update of user_id, full_name on public.trainers
  for each row when (new.user_id is not null) execute function public.trainer_login_sync();

-- The links that exist already.
select public.link_login(user_id, 'client', full_name) from public.clients where user_id is not null;
select public.link_login(user_id, 'trainer', full_name) from public.trainers where user_id is not null;

-- Refusing an online family switches its login off; that login now has the
-- Client role (and nothing more), so look for "client only" instead of "no role".
create or replace function public.refuse_family(cid uuid) returns void
language plpgsql set search_path = '' as $$
declare who uuid;
begin
  if not public.is_staff() then raise exception 'staff only'; end if;
  select user_id into who from public.clients where id = cid and online;
  if not found then raise exception 'only an online registration can be refused'; end if;
  delete from public.students where client_id = cid; -- refused if anything was charged
  delete from public.clients where id = cid;
  if who is not null then
    update public.profiles set active = false where id = who and roles <@ array['client']::public.app_role[];
  end if;
end $$;

-- The language the family uses in the app is the client's language in the CRM
-- (receipts, reminders and pushes go out in it).
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
    birth_date = nullif(h ->> 'birth_date', '')::date, address = public.clean(h ->> 'address', 200), relation = h ->> 'relation',
    lang = case when h ->> 'lang' in ('he', 'ru', 'en') then h ->> 'lang' else lang end
  where id = fam;
  return fam;
end $$;
