-- The public sign-up form asks for more (owner, 2026-11-13): full name in
-- Hebrew, Russian and/or English (at least one), phone, email, ID number and a
-- comment. Name and phone are required; the rest is kept when given.
-- The extra answers live in entries.details, readable by staff only like the
-- rest of the row. ASCII only.

alter table public.entries add column details jsonb not null default '{}';

drop function public.public_signup(uuid, text, text);

-- form = {name_he, name_ru, name_en, phone, email, id_number, comment}
-- Answers: ok | already (this phone is on the list) | full | closed | invalid | busy.
create function public.public_signup(eid uuid, form jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  e public.events;
  names text[];
  n text;
  tel text := btrim(coalesce(form ->> 'phone', ''));
  digits text := regexp_replace(tel, '\D', '', 'g');
  email text := lower(btrim(coalesce(form ->> 'email', '')));
  idnum text := btrim(coalesce(form ->> 'id_number', ''));
  note text := btrim(coalesce(form ->> 'comment', ''));
  kept jsonb := '{}';
begin
  select * into e from public.events where id = eid and public_signup;
  if not found or e.held_on < (now() at time zone 'Asia/Jerusalem')::date then
    return 'closed';
  end if;

  -- The names: whichever languages were filled in, tidied; at least one, each a sensible length.
  foreach n in array array['name_he', 'name_ru', 'name_en'] loop
    if btrim(coalesce(form ->> n, '')) <> '' then
      names := names || btrim(regexp_replace(form ->> n, '\s+', ' ', 'g'));
      kept := kept || jsonb_build_object(n, names[array_upper(names, 1)]);
    end if;
  end loop;
  if names is null or exists (select 1 from unnest(names) x where length(x) < 2 or length(x) > 80) then
    return 'invalid';
  end if;
  if length(digits) < 9 or length(digits) > 15 then
    return 'invalid';
  end if;
  if email <> '' and (length(email) > 120 or email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    return 'invalid';
  end if;
  if length(idnum) > 20 or idnum ~ '[^0-9A-Za-z -]' or length(note) > 500 then
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

  if email <> '' then kept := kept || jsonb_build_object('email', email); end if;
  if idnum <> '' then kept := kept || jsonb_build_object('id_number', idnum); end if;
  if note <> '' then kept := kept || jsonb_build_object('comment', note); end if;
  insert into public.entries (event_id, held_on, guest_name, phone, amount, online, details)
  values (eid, e.held_on, array_to_string(names, ' / '), tel, e.price, true, kept);
  return 'ok';
end $$;

revoke all on function public.public_signup(uuid, jsonb) from public;
grant execute on function public.public_signup(uuid, jsonb) to anon, authenticated;
