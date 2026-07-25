-- ============================================================
-- セキュリティ強化マイグレーション（テナント分離の穴を塞ぐ）
--
-- 適用方法:
--   Supabaseダッシュボード → SQL Editor でこのファイルを実行
--
-- ★ 冪等（何度実行してもエラーにならず、既存データは削除しない）
--   - すべて DROP POLICY IF EXISTS → CREATE、CREATE OR REPLACE FUNCTION
--   - DROP TABLE / DROP TYPE は使用しない
--
-- 【このマイグレーションが塞ぐ脆弱性】
--   1. profiles UPDATE に WITH CHECK が無く、ログインユーザーが
--      自分の profiles 行の company_id / role を書き換えられた
--      → 他社テナントへの乗り移り・自分をownerへ昇格が可能だった（重大）
--   2. profiles INSERT が id=auth.uid() のみで、company_id / role を
--      自由指定できた → 退職者が元会社へownerで再登録できた（重大）
--   3. estimate_items / invoice_items / purchase_order_items に
--      ロール判定が無く、閲覧のみ(viewer)が明細金額を改ざんできた
--
-- ★ 適用後の不変条件（テスト観点）
--   - 一般社員(staff/viewer)は自分の role / company_id を変更できない
--   - 誰も自分の company_id を他社IDへ変更できない
--   - 新規ユーザーは「メンバーが1人もいない会社」にだけ owner で参加できる
--   - viewer は明細(items)を読めるが書き込めない
-- ============================================================

-- ------------------------------------------------------------
-- ヘルパー: 指定会社にメンバーが1人でも存在するか
-- SECURITY DEFINER なので profiles のRLSを回避して判定でき、
-- profiles ポリシー内から参照しても再帰しない。
-- ------------------------------------------------------------
create or replace function company_has_members(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where company_id = cid)
$$;

-- ============================================================
-- 1) profiles: 自己昇格・テナント乗り移りを禁止
-- ============================================================

-- INSERT: 自分のIDで、メンバー未登録(=新規作成直後)の会社に、ownerとしてのみ参加可能
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert
  to authenticated
  with check (
    id = auth.uid()
    and role = 'owner'
    and not company_has_members(company_id)
  );

-- UPDATE: WITH CHECK を追加。
--   - どの行も company_id は自社から動かせない（テナント乗り移り不可）
--   - owner/admin は同社メンバーの role を変更可
--   - それ以外(自分の行)は role を現状のまま維持する場合のみ許可（自己昇格不可）
-- current_company_id()/current_role_of() は STABLE かつ更新前スナップショットを
-- 参照するため「変更前の自社ID・自ロール」を返す（＝新しい値と一致するか比較できる）。
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (
    id = auth.uid()
    or (company_id = current_company_id() and current_role_of() in ('owner','admin'))
  )
  with check (
    company_id = current_company_id()
    and (
      current_role_of() in ('owner','admin')
      or (id = auth.uid() and role = current_role_of())
    )
  );

-- ============================================================
-- 2) 明細テーブル: 親の会社スコープ + 書き込みはロール判定
--    （viewer は読めるが書けない。親テーブルと同じ権限モデルに揃える）
-- ============================================================

do $$
declare
  spec record;
begin
  for spec in
    select 'estimate_items'::text as tbl, 'estimates'::text as parent, 'estimate_id'::text as fk
    union all
    select 'invoice_items', 'invoices', 'invoice_id'
    union all
    select 'purchase_order_items', 'purchase_orders', 'purchase_order_id'
  loop
    -- 旧: FOR ALL の一括ポリシーを撤去
    execute format('drop policy if exists %s_all on %I', spec.tbl, spec.tbl);
    execute format('drop policy if exists %s_select on %I', spec.tbl, spec.tbl);
    execute format('drop policy if exists %s_insert on %I', spec.tbl, spec.tbl);
    execute format('drop policy if exists %s_update on %I', spec.tbl, spec.tbl);
    execute format('drop policy if exists %s_delete on %I', spec.tbl, spec.tbl);

    -- SELECT: 同社なら全ロール可
    execute format($f$
      create policy %1$s_select on %1$I for select
        using (exists (select 1 from %2$I p where p.id = %3$I and p.company_id = current_company_id()))
    $f$, spec.tbl, spec.parent, spec.fk);

    -- INSERT: owner/admin/staff のみ
    execute format($f$
      create policy %1$s_insert on %1$I for insert
        with check (
          current_role_of() in ('owner','admin','staff')
          and exists (select 1 from %2$I p where p.id = %3$I and p.company_id = current_company_id())
        )
    $f$, spec.tbl, spec.parent, spec.fk);

    -- UPDATE: owner/admin/staff のみ
    execute format($f$
      create policy %1$s_update on %1$I for update
        using (
          current_role_of() in ('owner','admin','staff')
          and exists (select 1 from %2$I p where p.id = %3$I and p.company_id = current_company_id())
        )
        with check (
          current_role_of() in ('owner','admin','staff')
          and exists (select 1 from %2$I p where p.id = %3$I and p.company_id = current_company_id())
        )
    $f$, spec.tbl, spec.parent, spec.fk);

    -- DELETE: owner/admin/staff のみ
    execute format($f$
      create policy %1$s_delete on %1$I for delete
        using (
          current_role_of() in ('owner','admin','staff')
          and exists (select 1 from %2$I p where p.id = %3$I and p.company_id = current_company_id())
        )
    $f$, spec.tbl, spec.parent, spec.fk);
  end loop;
end $$;

-- ============================================================
-- 完了。適用後、下記が拒否されることを確認してください（devtools等から）:
--   update profiles set role='owner' where id=<自分>       → WITH CHECK 違反で失敗
--   update profiles set company_id=<他社> where id=<自分>  → WITH CHECK 違反で失敗
--   insert into invoice_items ... （viewerで）              → ポリシー違反で失敗
-- ============================================================
