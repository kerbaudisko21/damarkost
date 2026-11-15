-- Damar Kost — jadwal cron (jalankan SETELAH: ekstensi pg_cron + pg_net aktif, dan 2 rahasia Vault dibuat).
-- Lihat docs/04-SETUP-SUPABASE.md langkah 3–4.

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
