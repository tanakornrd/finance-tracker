-- ============================================================================
-- Part 2: two more atomic functions needed for ขั้น 4.2 (accounts + savings-goals)
-- Run this in a NEW SQL Editor query, same as functions.sql before it.
-- ============================================================================

-- permanently_delete_account — mirrors the SQLite version's cascade: removes this account's
-- recurring bills (+ their occurrence markers) and every transaction that touches it, then the
-- account row itself, all as one step. Keeps the same "balance must be exactly 0 first" guard
-- so money can never silently vanish from net worth by deleting an account that still holds it.
create or replace function permanently_delete_account(p_account_id text) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_account accounts;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_account from accounts where id = p_account_id and user_id = v_user_id;
  if not found then raise exception 'account not found'; end if;
  if v_account.status <> 'trashed' then
    raise exception 'account must be trashed before it can be permanently deleted';
  end if;
  if v_account.balance <> 0 then
    raise exception 'ต้องโอนเงินออกจากบัญชีนี้ให้เหลือ 0 ก่อน ถึงจะลบถาวรได้ (ป้องกันเงินหายจากยอดรวม)';
  end if;

  delete from recurring_bill_occurrences
    where recurring_bill_id in (select id from recurring_bills where account_id = p_account_id and user_id = v_user_id);
  delete from recurring_bills where account_id = p_account_id and user_id = v_user_id;
  delete from transactions where (account_id = p_account_id or to_account_id = p_account_id) and user_id = v_user_id;
  delete from accounts where id = p_account_id and user_id = v_user_id;
end;
$$;

-- top_up_savings_goal — does current_amount = current_amount + p_amount as a single atomic
-- UPDATE inside Postgres, instead of the app reading the value then writing it back (which
-- would have a race window: two top-ups at nearly the same moment could overwrite each other).
create or replace function top_up_savings_goal(p_goal_id uuid, p_amount numeric(12,2)) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'topUpAmount must be a positive number'; end if;

  update savings_goals set current_amount = current_amount + p_amount
    where id = p_goal_id and user_id = v_user_id;
  if not found then raise exception 'goal not found'; end if;
end;
$$;

grant execute on function permanently_delete_account(text) to authenticated;
grant execute on function top_up_savings_goal(uuid, numeric) to authenticated;
