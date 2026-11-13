-- The school must always have an owner. On 2026-11-13 the only owner switched
-- off their own Owner role on the Accounts screen and was locked out of the
-- CRM; nothing stopped it. Now the last active owner cannot give up the role
-- or be deactivated from inside the app. (The SQL editor can still do
-- anything, which is also how such a lock-out is repaired.) ASCII only.

create or replace function public.profiles_guard() returns trigger
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
  if old.active and 'owner' = any (old.roles) and not (new.active and 'owner' = any (new.roles))
     and not exists (select 1 from public.profiles p where p.id <> old.id and p.active and 'owner' = any (p.roles)) then
    raise exception 'the school must keep at least one owner';
  end if;
  return new;
end $$;
