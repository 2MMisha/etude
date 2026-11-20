-- Out of /admin/ and into the CRM (owner, 2026-11-20):
--   * public_week(): the regular weekly group classes (group_slots of groups
--     still running), for the public site's Schedule page - day, time, length,
--     group, programme, trainer, hall. No one-date changes, private lessons or
--     rentals. Public (the site build reads it), like site_timetable.
--   * family_studio(): for a signed-in approved family (or staff) - the price
--     list from the CRM (memberships per programme and classes a week, the
--     unlimited and one-time entry prices, private lessons per trainer and
--     length) and the payment day setting the reminders use. Prices are no
--     longer typed in /admin/ or kept in the public repository.
-- ASCII only.

create function public.public_week() returns table (
  weekday int, start_time time, minutes int, group_name text, program text, trainer text, hall text
)
language sql stable security definer set search_path = '' as $$
  select s.weekday, s.start_time, s.minutes, g.name, p.name, coalesce(t.full_name, ''), s.hall
  from public.group_slots s
  join public.groups g on g.id = s.group_id and not g.archived
  join public.programs p on p.id = g.program_id
  left join public.trainers t on t.id = s.trainer_id
  order by s.weekday, s.start_time, g.name;
$$;
revoke all on function public.public_week() from public;
grant execute on function public.public_week() to anon, authenticated;

create function public.family_studio() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when not (public.is_staff() or public.family_approved()) then null else jsonb_build_object(
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object('program', p.name, 'minutes', p.minutes, 'per_week', pr.per_week, 'amount', pr.amount)
                       order by p.sort, p.name, pr.per_week)
      from public.prices pr join public.programs p on p.id = pr.program_id
      where pr.kind = 'group' and not p.archived), '[]'),
    'unlimited', (select amount from public.prices where kind = 'unlimited'),
    'entry', (select amount from public.prices where kind = 'entry'),
    'private', coalesce((
      select jsonb_agg(jsonb_build_object('trainer', t.full_name, 'minutes', r.minutes, 'amount', r.price) order by t.full_name, r.minutes)
      from public.trainer_rates r join public.trainers t on t.id = r.trainer_id
      where not t.archived), '[]'),
    'reminder', coalesce((select value from public.settings where id = 'payment_reminder'), '{"day": 1, "before": 3, "after": 7}')
  ) end;
$$;
revoke all on function public.family_studio() from public, anon;
grant execute on function public.family_studio() to authenticated;
