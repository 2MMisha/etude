-- People signing themselves up to a one-time group (master class) from a link
-- the school shares: full name and phone, no login.
-- This is the one place the public can write, so it is kept narrow: two
-- functions, nothing else. A visitor can read one event's public details and
-- add one guest entry to it - only while the school has switched sign-up on
-- for that event, it hasn't passed, and it isn't full. They can read no table
-- and see nobody else's sign-up. ASCII only.

alter table public.events add column public_signup boolean not null default false;
alter table public.events add column capacity int check (capacity > 0); -- places; empty = no limit set
alter table public.entries add column phone text not null default '';
alter table public.entries add column online boolean not null default false; -- signed up through the public page

-- What the sign-up page shows. Nothing about who has signed up, only whether there is room.
create function public.public_event(eid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', e.title, 'held_on', e.held_on, 'start_time', e.start_time, 'minutes', e.minutes,
    'hall', e.hall, 'price', e.price, 'trainer', t.full_name,
    'state', case
      when e.held_on < (now() at time zone 'Asia/Jerusalem')::date then 'closed'
      when (select count(*) from public.entries x where x.event_id = e.id) >= coalesce(e.capacity, 200) then 'full'
      else 'open' end
  )
  from public.events e left join public.trainers t on t.id = e.trainer_id
  where e.id = eid and e.public_signup;
$$;

-- Sign up. Answers with one word the page turns into a message:
-- ok | already (this phone is on the list) | full | closed | invalid | busy.
create function public.public_signup(eid uuid, guest text, tel text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  e public.events;
  who text := btrim(regexp_replace(coalesce(guest, ''), '\s+', ' ', 'g'));
  digits text := regexp_replace(coalesce(tel, ''), '\D', '', 'g');
begin
  select * into e from public.events where id = eid and public_signup;
  if not found or e.held_on < (now() at time zone 'Asia/Jerusalem')::date then
    return 'closed';
  end if;
  if length(who) < 2 or length(who) > 80 or length(digits) < 9 or length(digits) > 15 then
    return 'invalid';
  end if;
  if exists (select 1 from public.entries x where x.event_id = eid and regexp_replace(x.phone, '\D', '', 'g') = digits) then
    return 'already';
  end if;
  if (select count(*) from public.entries x where x.event_id = eid) >= coalesce(e.capacity, 200) then
    return 'full';
  end if;
  -- A brake on a script filling the list: no more than 30 online sign-ups to one event in an hour.
  if (select count(*) from public.entries x where x.event_id = eid and x.online and x.created_at > now() - interval '1 hour') >= 30 then
    return 'busy';
  end if;
  insert into public.entries (event_id, held_on, guest_name, phone, amount, online)
  values (eid, e.held_on, who, btrim(tel), e.price, true);
  return 'ok';
end $$;

revoke all on function public.public_event(uuid), public.public_signup(uuid, text, text) from public;
grant execute on function public.public_event(uuid), public.public_signup(uuid, text, text) to anon, authenticated;
