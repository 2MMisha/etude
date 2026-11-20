-- 90-minute private lessons (owner, 2026-11-20): every trainer has one, and
-- it is two 45-minute lessons: twice the price; the trainer gets twice a fixed
-- amount, or the same percent. The 90-minute row follows the 45-minute row
-- whenever that one is added, changed or removed, so it is never typed by hand.
-- No prices in this file: they are computed from the rows already there.
-- ASCII only.

create function public.rate_ninety() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.minutes = 45 then
      delete from public.trainer_rates where trainer_id = old.trainer_id and minutes = 90;
    end if;
    return old;
  end if;
  if new.minutes = 45 then
    insert into public.trainer_rates (trainer_id, minutes, price, pay_kind, pay_value)
    values (new.trainer_id, 90, new.price * 2, new.pay_kind,
            case when new.pay_kind = 'fixed' then new.pay_value * 2 else new.pay_value end)
    on conflict (trainer_id, minutes) do update
      set price = excluded.price, pay_kind = excluded.pay_kind, pay_value = excluded.pay_value;
  end if;
  return new;
end $$;
create trigger trainer_rates_ninety after insert or update or delete on public.trainer_rates
  for each row execute function public.rate_ninety();

-- The trainers who already have a 45-minute rate get their 90 now.
update public.trainer_rates set price = price where minutes = 45;
