-- Discounts in percent or in shekels, everywhere (owner, 2026-11-20):
--   * memberships: second child and full-year prepayment (settings
--     'second_child_ils', 'full_year_ils' next to the existing *_pct), Olim and
--     the other discount per student (students.olim_ils, custom_ils; the other
--     discount still needs a reason);
--   * private lessons: lesson_students.discount_ils next to discount_pct.
-- A total = the list price less the percents (added up, at most 100%), less
-- the shekels, never below 0. A charge's `discounts` keeps percents under their
-- name and shekels under name || '_ils'. ASCII only.

alter table public.students
  add column olim_ils numeric(10, 2) not null default 0 check (olim_ils >= 0),
  add column custom_ils numeric(10, 2) not null default 0 check (custom_ils >= 0),
  add constraint custom_ils_needs_comment check (custom_ils = 0 or length(trim(custom_comment)) > 0);

alter table public.lesson_students
  add column discount_ils numeric(10, 2) not null default 0 check (discount_ils >= 0);

create or replace view public.student_quotes with (security_invoker = true) as
with per_program as (
  select e.student_id, g.program_id, p.name, p.minutes, sum(e.per_week)::int as per_week
  from public.enrollments e
  join public.groups g on g.id = e.group_id
  join public.programs p on p.id = g.program_id
  group by e.student_id, g.program_id, p.name, p.minutes
),
list as (
  select pp.student_id,
    string_agg(pp.name || ' ' || pp.per_week || U&'\00D7' || pp.minutes, ' + ' order by pp.name) as description,
    case when bool_or(pr.amount is null) then null else sum(pr.amount) end as amount
  from per_program pp
  left join public.prices pr on pr.kind = 'group' and pr.program_id = pp.program_id and pr.per_week = pp.per_week
  group by pp.student_id
),
cfg as (
  select
    coalesce((select (value #>> '{}')::numeric from public.settings where id = 'second_child_pct'), 0) as second_child,
    coalesce((select (value #>> '{}')::numeric from public.settings where id = 'full_year_pct'), 0) as full_year,
    coalesce((select (value #>> '{}')::numeric from public.settings where id = 'second_child_ils'), 0) as second_child_ils,
    coalesce((select (value #>> '{}')::numeric from public.settings where id = 'full_year_ils'), 0) as full_year_ils
),
quoted as (
  select s.id as student_id,
    case when s.unlimited then U&'\221E' else l.description end as description,
    case when s.unlimited then (select amount from public.prices where kind = 'unlimited') else l.amount end as list_amount,
    case when s.second_child then cfg.second_child else 0 end as second_child,
    case when s.full_year then cfg.full_year else 0 end as full_year,
    s.olim_pct as olim,
    s.custom_pct as custom,
    case when s.second_child then cfg.second_child_ils else 0 end as second_child_ils,
    case when s.full_year then cfg.full_year_ils else 0 end as full_year_ils,
    s.olim_ils,
    s.custom_ils
  from public.students s
  left join list l on l.student_id = s.id
  cross join cfg
)
select student_id, description, list_amount,
  jsonb_strip_nulls(jsonb_build_object(
    'second_child', nullif(second_child, 0), 'full_year', nullif(full_year, 0),
    'olim', nullif(olim, 0), 'custom', nullif(custom, 0),
    'second_child_ils', nullif(second_child_ils, 0), 'full_year_ils', nullif(full_year_ils, 0),
    'olim_ils', nullif(olim_ils, 0), 'custom_ils', nullif(custom_ils, 0)
  )) as discounts,
  -- (greatest() would turn "no price" into 0: an unknown price stays null)
  case when list_amount is not null then greatest(0, round(list_amount * (1 - least(second_child + full_year + olim + custom, 100) / 100)
    - (second_child_ils + full_year_ils + olim_ils + custom_ils))) end as amount
from quoted;

create or replace function public.lesson_put_charges(lid uuid) returns void
language sql set search_path = '' as $$
  insert into public.charges (student_id, kind, day, description, list_amount, amount, lesson_id)
  select x.student_id, 'private', x.held_on, x.label, x.part,
    greatest(0, round(x.part * (1 - x.discount_pct / 100) - x.discount_ils, 2)), x.lesson_id
  from (
    select ls.student_id, ls.discount_pct, ls.discount_ils, l.held_on, l.id as lesson_id, t.full_name || ' ' || l.minutes || U&'\2032' as label,
      round(l.price / n.n, 2)
        + case when row_number() over (order by ls.id) = 1 then l.price - round(l.price / n.n, 2) * n.n else 0 end as part
    from public.lessons l
    join public.trainers t on t.id = l.trainer_id
    join public.lesson_students ls on ls.lesson_id = l.id
    cross join lateral (select count(*) + case when l.guest_name = '' then 0 else 1 end as n
                        from public.lesson_students y where y.lesson_id = l.id) n
    where l.id = lid
  ) x
  where not exists (select 1 from public.charges c where c.lesson_id = lid);
$$;

create or replace function public.lesson_discount_follow() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.charges c set amount = greatest(0, round(c.list_amount * (1 - new.discount_pct / 100) - new.discount_ils, 2))
  where c.lesson_id = new.lesson_id and c.student_id = new.student_id and c.kind = 'private';
  return new;
end $$;
drop trigger lesson_students_discount on public.lesson_students;
create trigger lesson_students_discount after update of discount_pct, discount_ils on public.lesson_students
  for each row when ((new.discount_pct, new.discount_ils) is distinct from (old.discount_pct, old.discount_ils))
  execute function public.lesson_discount_follow();
