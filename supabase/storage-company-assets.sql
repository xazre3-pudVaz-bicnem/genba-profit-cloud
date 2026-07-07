-- ============================================================
-- 会社ロゴなどのアセット用Storageバケット（公開読み取り）
--
-- 適用方法:
--   Supabaseダッシュボード → SQL Editor でこのファイルを実行
--
-- 未作成でもアプリは動作する（ロゴは documents バケットへ
-- フォールバック保存され、署名URLで表示される）。
-- このバケットを作成すると、ロゴが公開URLで配信されるようになる。
--
-- パス規約: {company_id}/logo/{timestamp}-{filename}
-- 書き込みは自社フォルダのみ（第1フォルダ = 会社ID）
-- ============================================================

insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do nothing;

-- 読み取り: 公開（ロゴは帳票・画面に直接埋め込むため）
create policy storage_company_assets_select on storage.objects for select
  using (bucket_id = 'company-assets');

-- 書き込み・削除: ログインユーザーの会社フォルダのみ
create policy storage_company_assets_insert on storage.objects for insert
  with check (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = current_company_id()::text
  );

create policy storage_company_assets_update on storage.objects for update
  using (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = current_company_id()::text
  );

create policy storage_company_assets_delete on storage.objects for delete
  using (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = current_company_id()::text
  );
