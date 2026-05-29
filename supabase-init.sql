-- ========================================
-- 剪贴板仓库 - Supabase 数据库初始化
-- 在 Supabase Dashboard → SQL Editor 中运行
-- ========================================

-- 1. 创建记录表
create table if not exists records (
  id uuid default gen_random_uuid() primary key,
  content text not null default '',
  tags text[] default '{}',
  pinned boolean default false,
  images text[] default '{}',
  created_at timestamptz default now()
);

-- 2. 创建索引（加速查询）
create index if not exists idx_records_created_at on records(created_at desc);
create index if not exists idx_records_pinned on records(pinned);
create index if not exists idx_records_tags on records using gin(tags);

-- 3. 创建自定义标签表（存储用户添加的标签）
create table if not exists custom_tags (
  id serial primary key,
  name text unique not null,
  created_at timestamptz default now()
);

-- 4. 关闭 RLS（个人工具，不需要行级安全）
alter table records enable row level security;
alter table custom_tags enable row level security;

-- 5. 添加允许所有操作的策略（通过 anon key 访问）
create policy "Allow all on records" on records for all using (true) with check (true);
create policy "Allow all on custom_tags" on custom_tags for all using (true) with check (true);

-- 6. 创建图片存储桶
insert into storage.buckets (id, name, public)
values ('clipboard-images', 'clipboard-images', true)
on conflict (id) do nothing;

-- 7. 存储桶访问策略
create policy "Public read clipboard-images" on storage.objects
  for select using (bucket_id = 'clipboard-images');

create policy "Public insert clipboard-images" on storage.objects
  for insert with check (bucket_id = 'clipboard-images');

create policy "Public delete clipboard-images" on storage.objects
  for delete using (bucket_id = 'clipboard-images');
