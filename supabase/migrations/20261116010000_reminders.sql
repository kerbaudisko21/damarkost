-- Damar Kost — notifikasi push pengingat + jadwal cron
-- Prasyarat: aktifkan ekstensi pg_cron dan pg_net (Dashboard → Database → Extensions),
-- lalu simpan 2 rahasia di Vault (lihat docs/04-SETUP-SUPABASE.md langkah 4).

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

-- 1) Tagihan bulanan otomatis: tiap hari 00:05 WIB (17:05 UTC hari sebelumnya)
select cron.schedule('damar-invoices', '5 17 * * *', $$select public.generate_invoices()$$);

-- 2) Pengingat pagi: tiap hari 08:00 WIB (01:00 UTC) → Edge Function daily-reminders
select cron.schedule('damar-reminders', '0 1 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
$$);
