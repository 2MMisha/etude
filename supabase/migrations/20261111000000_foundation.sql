-- Stage 0: accounts, roles, the activity log and the rules that guard them.
-- Business tables (clients, students, payments…) come with their own stages.
-- Checked by supabase/tests/access.test.mjs (npm run test:db).

create type public.app_role as enum ('owner', 'admin', 'trainer', 'client');

-- One row per login (auth.users). A person can hold several roles
-- (a trainer with admin rights = {trainer, admin}).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '', -- copy of the login, so staff can tell accounts apart
  full_name text not null default '',
  lang text not null default 'he' check (lang in ('he', 'ru', 'en')),
  roles public.app_role[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Every new login gets a profile with no roles: it can sign in and sees nothing.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role checks for the policies. Security definer, so they read profiles
-- without going through the policies that call them.
create function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.active and r = any (p.roles)
  );
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('owner') or public.has_role('admin');
$$;

-- What the policies can't say: which columns and which rows staff may change.
-- No logged-in user (SQL editor, service key) = not restricted here.
create function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if new.email <> old.email then
    raise exception 'the login email is changed through the account, not the profile';
  end if;
  if not public.is_staff() and (new.roles <> old.roles or new.active <> old.active) then
    raise exception 'only staff can change roles or deactivate an account';
  end if;
  if not public.has_role('owner') and ('owner' = any (old.roles) or 'owner' = any (new.roles)) then
    raise exception 'only the owner can change an owner account';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- Who did what: attach log_change() to every table that matters.
create table public.activity_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  row_id text not null,
  action text not null,
  old jsonb,
  new jsonb
);

create function public.log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activity_log (actor, table_name, row_id, action, old, new)
  values (
    (select auth.uid()), tg_table_name, coalesce(new.id, old.id)::text, lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger log_change after insert or update or delete on public.profiles
  for each row execute function public.log_change();

-- Access. Anonymous visitors get nothing; logged-in users only what the policies allow.
alter table public.profiles enable row level security;
alter table public.activity_log enable row level security;

revoke all on public.profiles, public.activity_log from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.activity_log to authenticated;

create policy "read own profile, staff read all" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());

create policy "edit own profile, staff edit all" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_staff())
  with check (id = (select auth.uid()) or public.is_staff());

-- The log is read-only, and only for staff; rows are written by the trigger.
create policy "staff read the log" on public.activity_log for select to authenticated
  using (public.is_staff());
