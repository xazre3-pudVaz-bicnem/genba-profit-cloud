-- ============================================================
-- 現場収支クラウド Supabaseスキーマ
-- 会社（company）単位でデータを完全分離するマルチテナント設計
--
-- 適用方法:
--   Supabaseダッシュボード → SQL Editor でこのファイルを実行
--   その後 Storage で "documents" バケットを作成（下記ポリシー参照）
-- ============================================================

-- ---------- 拡張 ----------
create extension if not exists "uuid-ossp";

-- ---------- ENUM ----------
create type project_status as enum ('estimate','ordered','in_progress','completed','invoiced','paid','lost');
create type tax_type as enum ('inclusive','exclusive','none');
create type revenue_status as enum ('unbilled','billed','paid');
create type cost_type as enum ('order','material','expense');
create type cost_status as enum ('unpaid','paid');
create type payment_method as enum ('cash','credit','transfer','invoice','other');
create type expense_category as enum ('parking','travel','highway','fuel','tools','consumables','disposal','site_misc','other');
create type document_type as enum ('receipt','receipt_official','invoice','estimate','purchase_order','delivery_note','other');
create type document_status as enum ('pending','analyzed','needs_review','registered','attention');
create type estimate_status as enum ('draft','sent','accepted','lost');
create type invoice_status as enum ('draft','sent','paid');
create type member_role as enum ('owner','admin','staff','viewer');
create type assignment_confidence as enum ('high','medium','low');

-- ============================================================
-- テーブル
-- ============================================================

-- 会社
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  postal_code text default '',
  address text default '',
  phone text default '',
  email text default '',
  invoice_registration_number text default '',
  bank_name text default '',
  bank_branch text default '',
  bank_account_type text default '普通',
  bank_account_number text default '',
  bank_account_holder text default '',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- プロフィール（auth.usersと1:1）
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  email text not null,
  role member_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 案件
create table projects (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  customer_name text default '',
  site_address text default '',
  manager_id uuid references profiles (id) on delete set null,
  status project_status not null default 'estimate',
  start_date date,
  due_date date,
  completed_date date,
  memo text default '',
  tags text[] not null default '{}',
  color text not null default '#F97316',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 売上
create table revenues (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  amount bigint not null default 0,            -- 税込合計（円）
  tax_type tax_type not null default 'inclusive',
  tax_amount bigint not null default 0,
  billing_due_date date,                        -- 請求予定日
  billed_date date,                             -- 請求日
  payment_due_date date,                        -- 入金予定日
  paid_date date,                               -- 入金日
  status revenue_status not null default 'unbilled',
  memo text default '',
  document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 原価（発注費・材料費・経費）
create table costs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  type cost_type not null,
  vendor_name text default '',
  title text default '',
  category expense_category,                    -- type='expense' のみ
  amount bigint not null default 0,             -- 税込合計（円）
  tax_type tax_type not null default 'inclusive',
  tax_amount bigint not null default 0,
  payment_method payment_method,
  purchase_date date,
  payment_due_date date,
  paid_date date,
  status cost_status not null default 'paid',
  memo text default '',
  document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 書類
create table documents (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies (id) on delete cascade,
  project_id uuid references projects (id) on delete set null,  -- null = 案件未割当
  uploaded_by uuid references profiles (id) on delete set null,
  document_type document_type not null default 'receipt',
  file_url text,
  thumbnail_url text,
  vendor_name text default '',
  document_date date,
  total_amount bigint,
  tax_amount bigint,
  ocr_text text default '',
  ai_json jsonb,                                 -- OCR/AI解析の生データ
  assignment_confidence assignment_confidence,
  status document_status not null default 'pending',
  registered_kind text check (registered_kind in ('cost','revenue')),
  registered_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 見積書
create table estimates (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies (id) on delete cascade,
  project_id uuid references projects (id) on delete set null,
  estimate_number text not null,
  customer_name text not null default '',
  title text not null default '',
  subtotal bigint not null default 0,
  tax_amount bigint not null default 0,
  total bigint not null default 0,
  issue_date date,
  valid_until date,
  status estimate_status not null default 'draft',
  memo text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table estimate_items (
  id uuid primary key default uuid_generate_v4(),
  estimate_id uuid not null references estimates (id) on delete cascade,
  name text not null default '',
  quantity numeric not null default 1,
  unit text not null default '式',
  unit_price bigint not null default 0,
  amount bigint not null default 0,
  sort_order int not null default 0
);

-- 請求書
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies (id) on delete cascade,
  project_id uuid references projects (id) on delete set null,
  invoice_number text not null,
  customer_name text not null default '',
  title text not null default '',
  subtotal bigint not null default 0,
  tax_amount bigint not null default 0,
  total bigint not null default 0,
  invoice_date date,
  due_date date,
  paid_date date,
  status invoice_status not null default 'draft',
  memo text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  name text not null default '',
  quantity numeric not null default 1,
  unit text not null default '式',
  unit_price bigint not null default 0,
  amount bigint not null default 0,
  sort_order int not null default 0
);

-- ---------- インデックス ----------
create index idx_profiles_company on profiles (company_id);
create index idx_projects_company on projects (company_id);
create index idx_projects_status on projects (company_id, status);
create index idx_revenues_company on revenues (company_id);
create index idx_revenues_project on revenues (project_id);
create index idx_costs_company on costs (company_id);
create index idx_costs_project on costs (project_id);
create index idx_documents_company on documents (company_id);
create index idx_documents_project on documents (project_id);
create index idx_estimates_company on estimates (company_id);
create index idx_invoices_company on invoices (company_id);

-- ---------- updated_at 自動更新 ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['companies','profiles','projects','revenues','costs','documents','estimates','invoices']
  loop
    execute format('create trigger trg_%s_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ============================================================
-- Row Level Security
-- 「ログインユーザーは自分のcompany_idのデータのみ操作できる」
-- ============================================================

-- 自分の会社IDを返すヘルパー
create or replace function current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

-- 自分のロールを返すヘルパー
create or replace function current_role_of()
returns member_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

alter table companies enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table revenues enable row level security;
alter table costs enable row level security;
alter table documents enable row level security;
alter table estimates enable row level security;
alter table estimate_items enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;

-- companies: 所属メンバーは閲覧可・オーナー/管理者のみ更新可・新規作成は認証済なら可（サインアップ時）
create policy companies_select on companies for select
  using (id = current_company_id());
create policy companies_insert on companies for insert
  to authenticated with check (true);
create policy companies_update on companies for update
  using (id = current_company_id() and current_role_of() in ('owner','admin'));

-- profiles: 同じ会社のメンバーを閲覧可・自分の行は作成可・管理者はロール変更可
create policy profiles_select on profiles for select
  using (company_id = current_company_id() or id = auth.uid());
create policy profiles_insert on profiles for insert
  to authenticated with check (id = auth.uid());
create policy profiles_update on profiles for update
  using (
    id = auth.uid()
    or (company_id = current_company_id() and current_role_of() in ('owner','admin'))
  );
create policy profiles_delete on profiles for delete
  using (company_id = current_company_id() and current_role_of() in ('owner','admin'));

-- 会社スコープの共通ポリシー（閲覧のみロールは書き込み不可）
do $$
declare t text;
begin
  foreach t in array array['projects','revenues','costs','documents','estimates','invoices']
  loop
    execute format($p$
      create policy %1$s_select on %1$I for select
        using (company_id = current_company_id());
      create policy %1$s_insert on %1$I for insert
        with check (company_id = current_company_id() and current_role_of() in ('owner','admin','staff'));
      create policy %1$s_update on %1$I for update
        using (company_id = current_company_id() and current_role_of() in ('owner','admin','staff'));
      create policy %1$s_delete on %1$I for delete
        using (company_id = current_company_id() and current_role_of() in ('owner','admin','staff'));
    $p$, t);
  end loop;
end $$;

-- 明細テーブル: 親の会社スコープに従う
create policy estimate_items_all on estimate_items for all
  using (exists (select 1 from estimates e where e.id = estimate_id and e.company_id = current_company_id()))
  with check (exists (select 1 from estimates e where e.id = estimate_id and e.company_id = current_company_id()));

create policy invoice_items_all on invoice_items for all
  using (exists (select 1 from invoices i where i.id = invoice_id and i.company_id = current_company_id()))
  with check (exists (select 1 from invoices i where i.id = invoice_id and i.company_id = current_company_id()));

-- ============================================================
-- Storage（書類画像）
-- ダッシュボードで "documents" バケット（非公開）を作成後、以下を実行
-- パス規約: {company_id}/{uuid}.jpg
-- ============================================================

-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

create policy storage_documents_select on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = current_company_id()::text);
create policy storage_documents_insert on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = current_company_id()::text);
create policy storage_documents_delete on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = current_company_id()::text);
