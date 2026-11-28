-- 知命雲端會員與命例同步 schema。
-- 會員資格（memberships）只允許伺服器（service_role / Stripe webhook）寫入；
-- 客戶端僅能讀自己的列。雲端命例（cloud_records）寫入需有效會員，於 RLS 執法。

create table if not exists public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'none'
    check (status in ('none', 'active', 'past_due', 'canceled')),
  plan text not null default 'annual',
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.cloud_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  record_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (user_id, record_id)
);

create index if not exists cloud_records_user_updated
  on public.cloud_records (user_id, updated_at);

alter table public.memberships enable row level security;
alter table public.cloud_records enable row level security;

-- 會員資格：本人可讀；無任何客戶端寫入 policy（insert/update/delete 全拒）。
drop policy if exists "read own membership" on public.memberships;
create policy "read own membership"
  on public.memberships for select
  to authenticated
  using (auth.uid() = user_id);

-- 有效會員判定：security definer 以便在 cloud_records policy 內讀 memberships。
create or replace function public.is_active_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = uid
      and m.status = 'active'
      and m.current_period_end > now()
  );
$$;

revoke all on function public.is_active_member(uuid) from public;
grant execute on function public.is_active_member(uuid) to authenticated;

-- 雲端命例：本人可讀（含過期會員，仍可匯出自身資料）。
drop policy if exists "read own records" on public.cloud_records;
create policy "read own records"
  on public.cloud_records for select
  to authenticated
  using (auth.uid() = user_id);

-- 寫入（新增/更新/刪除）僅限有效會員。
drop policy if exists "insert own records when member" on public.cloud_records;
create policy "insert own records when member"
  on public.cloud_records for insert
  to authenticated
  with check (auth.uid() = user_id and public.is_active_member(auth.uid()));

drop policy if exists "update own records when member" on public.cloud_records;
create policy "update own records when member"
  on public.cloud_records for update
  to authenticated
  using (auth.uid() = user_id and public.is_active_member(auth.uid()))
  with check (auth.uid() = user_id and public.is_active_member(auth.uid()));

drop policy if exists "delete own records when member" on public.cloud_records;
create policy "delete own records when member"
  on public.cloud_records for delete
  to authenticated
  using (auth.uid() = user_id and public.is_active_member(auth.uid()));