-- ============================================================================
-- Finance Tracker: Supabase (Postgres) schema
-- สร้างตารางให้ตรงกับ SQLite เดิม + user_id สำหรับแยกข้อมูลรายคน + เปิด RLS
--
-- เงินทุกคอลัมน์ใช้ numeric(12,2) — ทศนิยม 2 ตำแหน่งเป๊ะ ไม่มีปัดเศษ ไม่ใช้ float
-- id ทุกตารางเป็น uuid (แอปเดิมสร้าง id ด้วย crypto.randomUUID() อยู่แล้ว จึงแปลงตรงได้)
-- ============================================================================

-- เปิดใช้ฟังก์ชันสุ่ม uuid (มีอยู่แล้วโดยปกติใน Supabase แต่กันไว้)
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- accounts — บัญชีเงิน/หนี้ ของผู้ใช้แต่ละคน
-- ----------------------------------------------------------------------------
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('asset', 'debt')),
  balance numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'trashed')),
  interest_rate numeric(7,4) check (interest_rate >= 0),
  interest_rate_type text check (interest_rate_type in ('monthly', 'yearly')),
  monthly_payment numeric(12,2) check (monthly_payment >= 0),
  due_day integer check (due_day between 1 and 31),
  is_goal_account boolean not null default false,
  is_investment_account boolean not null default false,
  target_amount numeric(12,2) check (target_amount >= 0),
  target_date date
);

-- ----------------------------------------------------------------------------
-- transactions — รายรับ/รายจ่าย/โอน
-- ----------------------------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense', 'repay')),
  amount numeric(12,2) not null,
  category text,
  account_id uuid not null references accounts(id) on delete cascade,
  to_account_id uuid references accounts(id) on delete set null,
  date date not null,
  note text,
  is_installment boolean not null default false,
  installment_info jsonb,
  -- เวลาที่บันทึกจริง (ข้อ 8 ที่เพิ่งเพิ่มใน SQLite) — แถวเก่าที่ไม่มีค่าจะเป็น NULL เหมือนเดิม
  created_at timestamptz
);

create index idx_tx_user_date on transactions(user_id, date);
create index idx_tx_account_date on transactions(account_id, date);
create index idx_tx_to_account on transactions(to_account_id);

-- ----------------------------------------------------------------------------
-- recurring_bills — บิลที่จ่ายซ้ำ
-- ----------------------------------------------------------------------------
create table recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  category text,
  account_id uuid not null references accounts(id) on delete cascade,
  frequency text not null check (frequency in ('once', 'monthly', 'weekly', 'yearly')),
  start_date date not null,
  active boolean not null default true
);

-- ----------------------------------------------------------------------------
-- recurring_bill_occurrences — แต่ละครั้งที่บิลถึงกำหนด/จ่ายแล้ว
-- ----------------------------------------------------------------------------
create table recurring_bill_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_bill_id uuid not null references recurring_bills(id) on delete cascade,
  due_date date not null,
  status text not null check (status in ('paid', 'skipped')),
  transaction_id uuid references transactions(id) on delete set null,
  unique (recurring_bill_id, due_date)
);

-- ----------------------------------------------------------------------------
-- budgets — วงเงินงบประมาณต่อหมวดหมู่ต่อเดือน
-- ----------------------------------------------------------------------------
create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric(12,2) not null,
  unique (user_id, category)  -- เดิม category UNIQUE ทั้งตาราง เปลี่ยนเป็น unique ต่อผู้ใช้แทน
);

-- ----------------------------------------------------------------------------
-- savings_goals — เป้าหมายเงินออม
-- ----------------------------------------------------------------------------
create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null,
  target_date date not null,
  current_amount numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'trashed'))
);

-- ----------------------------------------------------------------------------
-- app_settings — ค่าตั้งค่าราย key/value (เดิม key เป็น global, ย้ายเป็นต่อผู้ใช้)
-- ----------------------------------------------------------------------------
create table app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text not null,
  unique (user_id, key)
);

-- ============================================================================
-- Row Level Security: เปิดทุกตาราง + policy "เห็น/แก้ได้เฉพาะแถวของตัวเอง"
-- auth.uid() คือ id ของผู้ใช้ที่ล็อกอินอยู่ตอนนั้น (มาจาก Supabase Auth token)
-- FOR ALL ครอบคลุมทั้ง select/insert/update/delete ในนโยบายเดียว
-- ============================================================================

alter table accounts enable row level security;
alter table transactions enable row level security;
alter table recurring_bills enable row level security;
alter table recurring_bill_occurrences enable row level security;
alter table budgets enable row level security;
alter table savings_goals enable row level security;
alter table app_settings enable row level security;

create policy "own rows only" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on recurring_bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on recurring_bill_occurrences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows only" on app_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
