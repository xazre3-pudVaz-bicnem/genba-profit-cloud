-- ============================================================
-- 発注書テーブルの追加（外注先・協力会社への発注）
--
-- 適用方法:
--   Supabaseダッシュボード → SQL Editor でこのファイルを実行
--
-- 未適用でもアプリは動作する（発注書はローカルキャッシュで動き、
-- DB同期時に「テーブル未作成」の案内が表示される）。
-- 本番で発注書を保存するにはこのSQLの適用が必要。
-- ============================================================

create type purchase_order_status as enum ('draft','sent');

create table purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies (id) on delete cascade,
  project_id uuid references projects (id) on delete set null,
  order_number text not null,
  vendor_name text not null default '',
  title text not null default '',
  subtotal bigint not null default 0,
  tax_amount bigint not null default 0,
  total bigint not null default 0,
  order_date date,
  delivery_date date,
  status purchase_order_status not null default 'draft',
  memo text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table purchase_order_items (
  id uuid primary key default uuid_generate_v4(),
  purchase_order_id uuid not null references purchase_orders (id) on delete cascade,
  name text not null default '',
  quantity numeric not null default 1,
  unit text not null default '式',
  unit_price bigint not null default 0,
  amount bigint not null default 0,
  sort_order int not null default 0
);

create index idx_purchase_orders_company on purchase_orders (company_id);
create index idx_purchase_orders_project on purchase_orders (project_id);

create trigger trg_purchase_orders_updated before update on purchase_orders
  for each row execute function set_updated_at();

alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;

-- 会社スコープ（既存テーブルと同じポリシー構成）
create policy purchase_orders_select on purchase_orders for select
  using (company_id = current_company_id());
create policy purchase_orders_insert on purchase_orders for insert
  with check (company_id = current_company_id() and current_role_of() in ('owner','admin','staff'));
create policy purchase_orders_update on purchase_orders for update
  using (company_id = current_company_id() and current_role_of() in ('owner','admin','staff'));
create policy purchase_orders_delete on purchase_orders for delete
  using (company_id = current_company_id() and current_role_of() in ('owner','admin','staff'));

-- 明細: 親の会社スコープに従う
create policy purchase_order_items_all on purchase_order_items for all
  using (exists (
    select 1 from purchase_orders po
    where po.id = purchase_order_id and po.company_id = current_company_id()
  ))
  with check (exists (
    select 1 from purchase_orders po
    where po.id = purchase_order_id and po.company_id = current_company_id()
  ));
