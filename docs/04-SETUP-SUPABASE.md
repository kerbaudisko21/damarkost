# Damar Kost — Setup Supabase (dilakukan pemilik/developer sendiri)

> Kunci API **tidak pernah** ditulis ke kode atau dikirim ke chat. Semua nilai rahasia diisi sendiri di dashboard / file `.env.local`.

## 1. Isi `.env.local`
1. Salin `app/.env.example` → `app/.env.local` (file ini sudah diabaikan git).
2. Dashboard Supabase → **Project Settings → API**:
   - `VITE_SUPABASE_URL` = *Project URL*
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = kunci **publishable** (`sb_publishable_...`; proyek lama: `VITE_SUPABASE_ANON_KEY`). Aman untuk browser karena data dilindungi RLS.
3. **Jangan** pakai `service_role` / secret key di file ini.

### 1b. Isi juga di Vercel (untuk damarkost.vercel.app)
Variabel `VITE_*` dibaca saat **build**, jadi harus ada di Vercel juga. Pilih salah satu:
- **Dashboard:** Vercel → proyek `damarkost` → Settings → Environment Variables → tambahkan 3 variabel di atas untuk *Production* (dan *Preview* bila perlu).
- **CLI** (dari folder `app/`, tiap perintah akan meminta nilai — ketik/tempel sendiri):
  ```bash
  vercel env add VITE_SUPABASE_URL production
  vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
  vercel env add VITE_VAPID_PUBLIC_KEY production
  vercel deploy --prod
  ```
> Hati-hati: `vercel env pull` akan **menimpa** `app/.env.local`. Simpan isinya dulu bila sudah diisi manual.

## 2. Buat tabel (sekali saja)
Dashboard → **SQL Editor** → **New query** → tempel **seluruh isi** `supabase/setup-sql-editor.sql` → **Run**.
Berkas ini gabungan 3 migrasi di `supabase/migrations/` (tabel, RLS, anti-bentrok, fungsi tagihan, bucket foto, langganan push, keterangan kamar).

> Alternatif: Supabase CLI → `supabase link --project-ref <ref>` lalu `supabase db push`.
> Bila aplikasi menampilkan **"Database belum disiapkan"** setelah login, berarti langkah ini belum dijalankan.

## 3. Aktifkan ekstensi
Dashboard → **Database → Extensions**: aktifkan **pg_cron** dan **pg_net**.

## 4. Simpan 2 rahasia di Vault (untuk cron memanggil Edge Function)
SQL Editor, ganti nilainya sendiri:
```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<service_role key>', 'service_role_key');
```

### 4b. Pasang jadwal cron
SQL Editor → tempel isi `supabase/cron.sql` → **Run**.

## 5. Kunci VAPID untuk notifikasi push
Sudah dibuat (16 Nov 2026) dan disimpan di `.secrets/vapid-keys.txt` (tidak ikut git). Public key sudah ada di `app/.env.local`.
Bila perlu membuat ulang: `npx web-push generate-vapid-keys` (semua HP harus mengaktifkan notifikasi ulang).
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
- **Authentication → Users → Add user → Create new user**: email + kata sandi pemilik, centang *Auto Confirm User*.
- **Authentication → Sign In / Providers → Email**: matikan **Allow new users to sign up** (hanya pemilik yang boleh masuk).
- **Authentication → URL Configuration**: *Site URL* = `https://damarkost.vercel.app`, dan tambahkan `https://damarkost.vercel.app/**` + `http://localhost:5174/**` ke *Redirect URLs* (untuk tautan "Lupa kata sandi").

Saat pertama kali masuk, aplikasi otomatis membuat: pengaturan kos, **9 kamar** (101–104, 201–205, harga Rp0 — atur di **Lainnya → Pengaturan → Kamar**), dan 5 sumber pesanan homestay.

## Jadwal cron yang aktif
| Nama | Waktu | Tugas |
|---|---|---|
| `damar-invoices` | 00:05 WIB | Membuat tagihan bulanan (idempoten) |
| `damar-reminders` | 08:00 WIB | Push ke iPhone: tagihan telat / jatuh tempo, check-in & check-out hari ini |

Cek riwayat: `select * from cron.job_run_details order by start_time desc limit 20;`

## Catatan iPhone
Notifikasi push hanya bisa di iPhone **iOS 16.4+** yang sudah **memasang Damar Kost ke Layar Utama** dan menyalakan notifikasi dari **Pengaturan → Notifikasi pengingat** di aplikasi.
