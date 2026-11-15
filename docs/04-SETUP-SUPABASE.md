# Damar Kost — Setup Supabase (dilakukan pemilik/developer sendiri)

> Kunci API **tidak pernah** ditulis ke kode atau dikirim ke chat. Semua nilai rahasia diisi sendiri di dashboard / file `.env.local`.

## 1. Isi `.env.local`
1. Salin `app/.env.example` → `app/.env.local` (file ini sudah diabaikan git).
2. Dashboard Supabase → **Project Settings → API**:
   - `VITE_SUPABASE_URL` = *Project URL*
   - `VITE_SUPABASE_ANON_KEY` = kunci **anon / publishable** (aman untuk browser karena data dilindungi RLS)
3. **Jangan** pakai `service_role` / secret key di file ini.

### 1b. Isi juga di Vercel (untuk damarkost.vercel.app)
Variabel `VITE_*` dibaca saat **build**, jadi harus ada di Vercel juga. Pilih salah satu:
- **Dashboard:** Vercel → proyek `damarkost` → Settings → Environment Variables → tambahkan 3 variabel di atas untuk *Production* (dan *Preview* bila perlu).
- **CLI** (dari folder `app/`, tiap perintah akan meminta nilai — ketik/tempel sendiri):
  ```bash
  vercel env add VITE_SUPABASE_URL production
  vercel env add VITE_SUPABASE_ANON_KEY production
  vercel env add VITE_VAPID_PUBLIC_KEY production
  vercel deploy --prod
  ```
> Hati-hati: `vercel env pull` akan **menimpa** `app/.env.local`. Simpan isinya dulu bila sudah diisi manual.

## 2. Jalankan migrasi database
Dashboard → **SQL Editor** → jalankan isi file berurutan:
1. `supabase/migrations/20261116000000_init.sql` — tabel, RLS, anti-bentrok, fungsi tagihan, bucket foto.
2. (setelah langkah 3 & 4) `supabase/migrations/20261116010000_reminders.sql` — langganan push + jadwal cron.
3. `supabase/migrations/20261116020000_room_label.sql` — ganti tipe Standar/AC dengan keterangan kamar (semua kamar ber-AC).

> Alternatif: Supabase CLI → `supabase link --project-ref <ref>` lalu `supabase db push`.

## 3. Aktifkan ekstensi
Dashboard → **Database → Extensions**: aktifkan **pg_cron** dan **pg_net**.

## 4. Simpan 2 rahasia di Vault (untuk cron memanggil Edge Function)
SQL Editor, ganti nilainya sendiri:
```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<service_role key>', 'service_role_key');
```

## 5. Kunci VAPID untuk notifikasi push
Di komputer:
```bash
npx web-push generate-vapid-keys
```
- *Public key* → `VITE_VAPID_PUBLIC_KEY` di `app/.env.local`
- Simpan sebagai secret Edge Function:
```bash
supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT=mailto:<email-anda>
```

## 6. Deploy Edge Function pengingat
```bash
supabase functions deploy daily-reminders --no-verify-jwt
```
(Fungsi memeriksa sendiri header `Authorization: Bearer <service_role>` dari cron.)

## 7. Buat akun pemilik & matikan pendaftaran
- **Authentication → Users → Add user**: email + kata sandi pemilik.
- **Authentication → Providers → Email**: matikan **Allow new users to sign up**.

## Jadwal cron yang aktif
| Nama | Waktu | Tugas |
|---|---|---|
| `damar-invoices` | 00:05 WIB | Membuat tagihan bulanan (idempoten) |
| `damar-reminders` | 08:00 WIB | Push ke iPhone: tagihan telat / jatuh tempo, check-in & check-out hari ini |

Cek riwayat: `select * from cron.job_run_details order by start_time desc limit 20;`

## Catatan iPhone
Notifikasi push hanya bisa di iPhone **iOS 16.4+** yang sudah **memasang Damar Kost ke Layar Utama** dan menyalakan notifikasi dari **Pengaturan → Notifikasi pengingat** di aplikasi.
