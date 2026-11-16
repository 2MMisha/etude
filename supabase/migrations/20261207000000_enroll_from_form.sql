-- The group a family chooses in appendix 1 ("Programme or group wanted") puts
-- the student in that group straight away (owner, 2026-11-16), with the
-- group's default times a week. Nothing happens for "I don't know", for a
-- group that no longer exists or is archived, or when the student is already
-- in it; a later choice adds that group too and never removes one. Staff
-- can change or remove it on the client page as usual. ASCII only.

create function public.enroll_from_form() returns trigger
language plpgsql security definer set search_path = '' as $$
declare gid uuid;
begin
  if new.form <> 'f1' then return null; end if;
  select g.id into gid from public.groups g
  where not g.archived and g.name = btrim(coalesce(new.answers ->> 'group', ''))
  limit 1;
  if gid is not null then
    insert into public.enrollments (student_id, group_id) values (new.student_id, gid)
    on conflict (student_id, group_id) do nothing;
  end if;
  return null;
end $$;
create trigger enroll_from_form after insert on public.student_forms
  for each row execute function public.enroll_from_form();

-- Appendix 1 forms sent before this: the newest one of each student, once.
insert into public.enrollments (student_id, group_id)
select f.student_id, g.id
from (select distinct on (student_id) student_id, answers from public.student_forms where form = 'f1' order by student_id, submitted_at desc) f
join public.groups g on not g.archived and g.name = btrim(coalesce(f.answers ->> 'group', ''))
on conflict (student_id, group_id) do nothing;
