-- Students are shown as "Hebrew name (English name)" in every picker (owner,
-- 2026-11-17), so the trainer's list of students also carries the English name.
-- The function's result changes shape, so it is made again. ASCII only.

drop function public.trainer_students();
create function public.trainer_students() returns table (id uuid, full_name text, full_name_en text, partner_id uuid)
language sql stable security definer set search_path = '' as $$
  select s.id, s.full_name, s.full_name_en, s.partner_id from public.students s
  where not s.archived and public.my_trainer_id() is not null
  order by s.full_name;
$$;
revoke all on function public.trainer_students() from public, anon;
grant execute on function public.trainer_students() to authenticated;
