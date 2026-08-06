-- ============================================================================
-- Finance Tracker: atomic money-moving functions (run once via SQL Editor)
--
-- Why these exist: recording/editing/deleting a transaction always touches two
-- things together — the transactions row AND one or two accounts' balances.
-- If those happened as separate requests from the Express server, a crash or
-- network drop between them could leave a balance updated without its
-- matching transaction row (or vice versa). Doing it inside one Postgres
-- function makes it a single all-or-nothing operation, same guarantee
-- server/routes/transactions.js's db.transaction(...) gave with SQLite.
--
-- Security: every function reads auth.uid() itself — the caller's identity
-- from their login token — rather than trusting any user_id passed in as a
-- parameter. That's what stops one logged-in user from acting on someone
-- else's data even though these functions run with elevated privileges
-- (security definer) to bypass RLS internally.
-- ============================================================================

-- Fix from ขั้นที่ 2: originally "on delete set null", but the app's original SQLite trigger
-- deleted the occurrence row entirely when its linked transaction was deleted (a paid bill
-- occurrence with no transaction behind it doesn't make sense). recurring_bill_occurrences
-- still has 0 rows, so this is a safe structural fix, not a data change.
-- Looks up the real auto-generated constraint name instead of assuming it, then replaces it —
-- safer than hardcoding a name that Postgres's naming convention usually produces but isn't
-- guaranteed to.
do $$
declare
  con text;
begin
  select conname into con from pg_constraint
    where conrelid = 'recurring_bill_occurrences'::regclass
      and confrelid = 'transactions'::regclass;
  if con is not null then
    execute format('alter table recurring_bill_occurrences drop constraint %I', con);
  end if;
  alter table recurring_bill_occurrences
    add constraint recurring_bill_occurrences_transaction_id_fkey
    foreign key (transaction_id) references transactions(id) on delete cascade;
end $$;

-- ----------------------------------------------------------------------------
-- insert_transaction — records income/expense/repay(transfer) and updates the
-- affected account balance(s) in one step. Returns the new transaction id.
-- ----------------------------------------------------------------------------
create or replace function insert_transaction(
  p_kind text,
  p_amount numeric(12,2),
  p_category text,
  p_account_id text,
  p_to_account_id text,
  p_date date,
  p_note text,
  p_is_installment boolean default false,
  p_installment_info jsonb default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_account accounts;
  v_to_account accounts;
  v_sign numeric;
  v_type_sign numeric;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be a positive number'; end if;

  select * into v_account from accounts where id = p_account_id and user_id = v_user_id;
  if not found then raise exception 'account not found'; end if;

  if p_kind in ('repay', 'transfer') then
    select * into v_to_account from accounts where id = p_to_account_id and user_id = v_user_id;
    if not found then raise exception 'toAccount not found'; end if;

    -- 'transfer' is stored as 'repay' — same reason as the original SQLite comment: avoids
    -- widening the kind check constraint for what's still just an account-to-account move.
    insert into transactions (id, user_id, kind, amount, category, account_id, to_account_id, date, note, is_installment, installment_info, created_at)
    values (v_id, v_user_id, 'repay', p_amount, null, p_account_id, p_to_account_id, p_date, coalesce(p_note, ''), false, null, now());

    update accounts set balance = balance - p_amount where id = p_account_id and user_id = v_user_id;
    update accounts set balance = balance + (case when v_to_account.type = 'debt' then -1 else 1 end) * p_amount
      where id = p_to_account_id and user_id = v_user_id;
  else
    insert into transactions (id, user_id, kind, amount, category, account_id, to_account_id, date, note, is_installment, installment_info, created_at)
    values (v_id, v_user_id, p_kind, p_amount, p_category, p_account_id, null, p_date, coalesce(p_note, ''), coalesce(p_is_installment, false), p_installment_info, now());

    v_sign := case when p_kind = 'income' then 1 else -1 end;
    v_type_sign := case when v_account.type = 'debt' then -1 else 1 end;
    update accounts set balance = balance + (v_sign * v_type_sign * p_amount) where id = p_account_id and user_id = v_user_id;
  end if;

  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- delete_transaction — reverses the balance effect and removes the row.
-- ----------------------------------------------------------------------------
create or replace function delete_transaction(p_tx_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tx transactions;
  v_account accounts;
  v_to_account accounts;
  v_sign numeric;
  v_type_sign numeric;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_tx from transactions where id = p_tx_id and user_id = v_user_id;
  if not found then raise exception 'transaction not found'; end if;

  if v_tx.kind = 'repay' then
    update accounts set balance = balance + v_tx.amount where id = v_tx.account_id and user_id = v_user_id;
    select * into v_to_account from accounts where id = v_tx.to_account_id and user_id = v_user_id;
    if found then
      update accounts set balance = balance - (case when v_to_account.type = 'debt' then -1 else 1 end) * v_tx.amount
        where id = v_tx.to_account_id and user_id = v_user_id;
    end if;
  else
    select * into v_account from accounts where id = v_tx.account_id and user_id = v_user_id;
    v_sign := case when v_tx.kind = 'income' then 1 else -1 end;
    v_type_sign := case when v_account.type = 'debt' then -1 else 1 end;
    update accounts set balance = balance - (v_sign * v_type_sign * v_tx.amount) where id = v_tx.account_id and user_id = v_user_id;
  end if;

  -- recurring_bill_occurrences linked to this tx are cascade-deleted by the FK fixed above.
  delete from transactions where id = p_tx_id and user_id = v_user_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- edit_transaction — reverses the old balance effect, applies the new one.
-- kind and to_account_id are never edited here (matches TransactionDetail.jsx's
-- edit form, which doesn't offer either), so both steps use the row's original kind.
-- Pass NULL for any field that should stay unchanged.
-- ----------------------------------------------------------------------------
create or replace function edit_transaction(
  p_tx_id uuid,
  p_amount numeric(12,2),
  p_category text,
  p_account_id text,
  p_date date,
  p_note text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tx transactions;
  v_old_account accounts;
  v_old_to accounts;
  v_new_account accounts;
  v_amount numeric(12,2);
  v_account_id text;
  v_date date;
  v_note text;
  v_category text;
  v_sign numeric;
  v_type_sign numeric;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_tx from transactions where id = p_tx_id and user_id = v_user_id;
  if not found then raise exception 'transaction not found'; end if;

  v_amount := coalesce(p_amount, v_tx.amount);
  if v_amount <= 0 then raise exception 'amount must be a positive number'; end if;
  v_category := coalesce(p_category, v_tx.category);
  v_account_id := coalesce(p_account_id, v_tx.account_id);
  v_date := coalesce(p_date, v_tx.date);
  v_note := coalesce(p_note, v_tx.note);

  select * into v_new_account from accounts where id = v_account_id and user_id = v_user_id;
  if not found then raise exception 'account not found'; end if;

  -- reverse old effect
  if v_tx.kind = 'repay' then
    update accounts set balance = balance + v_tx.amount where id = v_tx.account_id and user_id = v_user_id;
    select * into v_old_to from accounts where id = v_tx.to_account_id and user_id = v_user_id;
    if found then
      update accounts set balance = balance - (case when v_old_to.type = 'debt' then -1 else 1 end) * v_tx.amount
        where id = v_tx.to_account_id and user_id = v_user_id;
    end if;
  else
    select * into v_old_account from accounts where id = v_tx.account_id and user_id = v_user_id;
    v_sign := case when v_tx.kind = 'income' then 1 else -1 end;
    v_type_sign := case when v_old_account.type = 'debt' then -1 else 1 end;
    update accounts set balance = balance - (v_sign * v_type_sign * v_tx.amount) where id = v_tx.account_id and user_id = v_user_id;
  end if;

  -- apply new effect (toAccountId isn't editable — destination leg still uses tx.to_account_id)
  if v_tx.kind = 'repay' then
    update accounts set balance = balance - v_amount where id = v_account_id and user_id = v_user_id;
    select * into v_old_to from accounts where id = v_tx.to_account_id and user_id = v_user_id;
    update accounts set balance = balance + (case when v_old_to.type = 'debt' then -1 else 1 end) * v_amount
      where id = v_tx.to_account_id and user_id = v_user_id;
  else
    v_sign := case when v_tx.kind = 'income' then 1 else -1 end;
    v_type_sign := case when v_new_account.type = 'debt' then -1 else 1 end;
    update accounts set balance = balance + (v_sign * v_type_sign * v_amount) where id = v_account_id and user_id = v_user_id;
  end if;

  update transactions set amount = v_amount, category = v_category, account_id = v_account_id, date = v_date, note = v_note
    where id = p_tx_id and user_id = v_user_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- pay_or_skip_occurrence — recurring-bill "pay" (creates the expense
-- transaction via insert_transaction above) or "skip" (no money moves), plus
-- upserting the occurrence marker, as one step — a partial failure here could
-- otherwise leave a paid bill without its "paid" marker and let it be paid twice.
-- ----------------------------------------------------------------------------
create or replace function pay_or_skip_occurrence(
  p_bill_id uuid,
  p_due_date date,
  p_action text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bill recurring_bills;
  v_tx_id uuid := null;
  v_status text;
  v_existing_id uuid;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_action not in ('pay', 'skip') then raise exception 'action must be pay or skip'; end if;

  select * into v_bill from recurring_bills where id = p_bill_id and user_id = v_user_id;
  if not found then raise exception 'bill not found'; end if;

  if p_action = 'pay' then
    v_tx_id := insert_transaction('expense', v_bill.amount, v_bill.category, v_bill.account_id, null, p_due_date, 'บิลประจำ: ' || v_bill.name);
    v_status := 'paid';
  else
    v_status := 'skipped';
  end if;

  select id into v_existing_id from recurring_bill_occurrences
    where recurring_bill_id = p_bill_id and due_date = p_due_date and user_id = v_user_id;

  if v_existing_id is not null then
    update recurring_bill_occurrences set status = v_status, transaction_id = v_tx_id where id = v_existing_id;
  else
    insert into recurring_bill_occurrences (id, user_id, recurring_bill_id, due_date, status, transaction_id)
    values (gen_random_uuid(), v_user_id, p_bill_id, p_due_date, v_status, v_tx_id);
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- delete_recurring_bill — removes the bill definition and its occurrence
-- markers only. Transactions already created from past "pay" actions are real
-- money movements and are left untouched (same as the original SQLite version).
-- ----------------------------------------------------------------------------
create or replace function delete_recurring_bill(p_bill_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  delete from recurring_bill_occurrences where recurring_bill_id = p_bill_id and user_id = v_user_id;
  delete from recurring_bills where id = p_bill_id and user_id = v_user_id;
end;
$$;

-- Only logged-in users may call any of these (each function also self-checks auth.uid() is
-- not null, so this grant is belt-and-suspenders, not the only line of defense).
grant execute on function insert_transaction(text, numeric, text, text, text, date, text, boolean, jsonb) to authenticated;
grant execute on function delete_transaction(uuid) to authenticated;
grant execute on function edit_transaction(uuid, numeric, text, text, date, text) to authenticated;
grant execute on function pay_or_skip_occurrence(uuid, date, text) to authenticated;
grant execute on function delete_recurring_bill(uuid) to authenticated;
