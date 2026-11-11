-- Stage 1: clients, students, groups, the price list and monthly membership
-- charges. Staff (owner, admin) only for now; trainers and parents get their
-- own, narrower rules with their stages.
-- No prices here — this repository is public; they are typed in /crm/ → Settings.

-- Who pays and is contacted.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  lang text not null default 'he' check (lang in ('he', 'ru', 'en')),
  notes text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Who dances. An adult is a client with one student: themselves.
create table public.students (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  full_name text not null check (length(trim(full_name)) > 0),
  birth_date date,
  phone text not null default '',
  level text not null default '',
  notes text not null default '',
  -- Membership options; they feed student_quotes below.
  unlimited boolean not null default false,
  second_child boolean not null default false,
  full_year boolean not null default false,
  olim_pct numeric(5, 2) not null default 0 check (olim_pct between 0 and 100),
  custom_pct numeric(5, 2) not null default 0 check (custom_pct between 0 and 100),
  custom_comment text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  constraint custom_discount_needs_comment check (custom_pct = 0 or length(trim(custom_comment)) > 0)
);

-- A programme is a row of the price sheet ("Kids", "Hobby"…); its groups share its prices.
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  minutes int not null default 60 check (minutes > 0),
  sort int not null default 0,
  archived boolean not null default false
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  program_id uuid not null references public.programs (id) on delete restrict,
  archived boolean not null default false
);

-- The whole price list. 'group' = a programme at N classes a week, per month;
-- 'unlimited' and 'entry' (one-time group entry) are single rows; 'private'
-- and 'rental' are labelled rows.
create table public.prices (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('group', 'unlimited', 'entry', 'private', 'rental')),
  program_id uuid references public.programs (id) on delete cascade,
  per_week int check (per_week between 1 and 7),
  label text not null default '',
  amount numeric(10, 2) not null check (amount >= 0),
  sort int not null default 0,
  check ((kind = 'group') = (program_id is not null and per_week is not null)),
  unique (program_id, per_week)
);
create unique index one_price_each on public.prices (kind) where kind in ('unlimited', 'entry');

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete restrict,
  per_week int not null default 1 check (per_week between 1 and 7),
  unique (student_id, group_id)
);

-- Single values: 'second_child_pct', 'full_year_pct'.
create table public.settings (
  id text primary key,
  value jsonb not null
);
insert into public.settings (id, value) values ('second_child_pct', '0'), ('full_year_pct', '0');

-- What a student owes. A membership is one line per calendar month; the list
-- price and the discounts are kept on the line, so later price changes don't
-- rewrite history. A price set by hand must say why.
create table public.charges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  kind text not null default 'membership' check (kind in ('membership', 'private', 'entry', 'other')),
  month date check (month = date_trunc('month', month)::date),
  description text not null default '',
  list_amount numeric(10, 2),
  discounts jsonb not null default '{}',
  amount numeric(10, 2) not null check (amount >= 0),
  manual boolean not null default false,
  comment text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint manual_price_needs_comment check (not manual or length(trim(comment)) > 0),
  check (kind <> 'membership' or month is not null)
);
create unique index one_membership_a_month on public.charges (student_id, month) where kind = 'membership';

-- The suggested monthly price of every student: per programme, the price for
-- the classes a week they take in its groups, summed over programmes (or the
-- unlimited price); then the discounts, which add up. Null = no price row for
-- that combination, the admin sets it by hand.
create view public.student_quotes with (security_invoker = true) as
with per_program as (
  select e.student_id, g.program_id, p.name, p.minutes, sum(e.per_week)::int as per_week
  from public.enrollments e
  join public.groups g on g.id = e.group_id
  join public.programs p on p.id = g.program_id
  group by e.student_id, g.program_id, p.name, p.minutes
),
list as (
  select pp.student_id,
    string_agg(pp.name || ' ' || pp.per_week || '×' || pp.minutes, ' + ' order by pp.name) as description,
    case when bool_or(pr.amount is null) then null else sum(pr.amount) end as amount
  from per_program pp
  left join public.prices pr on pr.kind = 'group' and pr.program_id = pp.program_id and pr.per_week = pp.per_week
  group by pp.student_id
),
pct as (
  select
    coalesce((select (value #>> '{}')::numeric from public.settings where id = 'second_child_pct'), 0) as second_child,
    coalesce((select (value #>> '{}')::numeric from public.settings where id = 'full_year_pct'), 0) as full_year
),
quoted as (
  select s.id as student_id,
    case when s.unlimited then '∞' else l.description end as description,
    case when s.unlimited then (select amount from public.prices where kind = 'unlimited') else l.amount end as list_amount,
    case when s.second_child then pct.second_child else 0 end as second_child,
    case when s.full_year then pct.full_year else 0 end as full_year,
    s.olim_pct as olim,
    s.custom_pct as custom
  from public.students s
  left join list l on l.student_id = s.id
  cross join pct
)
select student_id, description, list_amount,
  jsonb_strip_nulls(jsonb_build_object(
    'second_child', nullif(second_child, 0), 'full_year', nullif(full_year, 0),
    'olim', nullif(olim, 0), 'custom', nullif(custom, 0)
  )) as discounts,
  round(list_amount * (1 - least(second_child + full_year + olim + custom, 100) / 100)) as amount
from quoted;

-- Charge every active student who has a price and no membership line for that
-- month yet. Safe to run again; returns how many lines it added. Runs with the
-- caller's rights, so only staff get anywhere.
create function public.create_month_charges(m date) returns int
language plpgsql set search_path = '' as $$
declare n int;
begin
  insert into public.charges (student_id, kind, month, description, list_amount, discounts, amount)
  select s.id, 'membership', date_trunc('month', m)::date, q.description, q.list_amount, q.discounts, q.amount
  from public.students s
  join public.clients c on c.id = s.client_id
  join public.student_quotes q on q.student_id = s.id
  where not s.archived and not c.archived and q.amount is not null
  on conflict (student_id, month) where kind = 'membership' do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Access: staff only, and every change is logged.
do $$
declare t text;
begin
  foreach t in array array['clients', 'students', 'programs', 'groups', 'prices', 'enrollments', 'settings', 'charges'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "staff only" on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create trigger log_change after insert or update or delete on public.%I for each row execute function public.log_change()', t);
  end loop;
end $$;

revoke all on public.student_quotes from anon, authenticated;
grant select on public.student_quotes to authenticated;
