-- Damar Kost — notifikasi push pengingat + jadwal cron
-- Jadwal cron ada di supabase/cron.sql (dijalankan setelah pg_cron, pg_net & Vault siap).

alter table property add column if not exists lang text not null default 'id' check (lang in ('id', 'en'));
alter table property add column if not exists reminder_hour smallint not null default 8 check (reminder_hour between 0 and 23);

-- Langganan push per perangkat (iPhone yang sudah "Tambahkan ke Layar Utama")
create table if not exists push_subscription (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table push_subscription enable row level security;
create policy owner_all on push_subscription for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
