# Damar Kost — aplikasi PWA (iPhone)

Aplikasi pengelolaan kos + homestay untuk 1 pemilik. React + TypeScript + Vite, dipasang di iPhone lewat Safari → **Tambahkan ke Layar Utama**.

> **Status: mode demo.** Semua data disimpan di perangkat (IndexedDB) dan diisi contoh 9 kamar. Penyambungan ke Supabase adalah tahap berikutnya — lihat `../docs/03-TECH-PLAN.md` dan `../supabase/migrations/`.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5174 (lihat .claude/launch.json di folder induk)
npm test           # tes logika tagihan, denda, prorata, homestay
npm run build      # hasil di dist/ (sudah termasuk service worker & manifest)
npm run icons      # buat ulang ikon PNG dari ../brand/damar-kost-icon.svg
```

## Mencoba di iPhone

- **Cepat (jaringan Wi-Fi yang sama):** jalankan `npm run dev`, buka alamat `Network` yang tampil di terminal (mis. `http://192.168.x.x:5174`) di Safari iPhone. Tampilan & alur bisa dicoba, tapi fitur offline tidak aktif karena belum HTTPS.
- **Seperti aslinya:** deploy folder `dist/` ke hosting HTTPS gratis (Cloudflare Pages / Netlify / Vercel), buka link-nya di Safari, lalu ikuti kartu **"Pasang ke Layar Utama"** di Beranda.

## Struktur

```
src/
  domain/     logika murni: tagihan, status, denda, prorata, homestay (+ tes)
  data/       data contoh & penyimpanan (mode demo → nanti Supabase)
  lib/        tanggal, format Rupiah, WhatsApp, kamus ID/EN, tema
  components/ logo, rumah ilustrasi, lembar bawah, toast, panduan pasang
  screens/    Beranda, Kamar, Tagihan, Lainnya, Penghuni, Profil, Homestay, Pengeluaran, Laporan, Pengaturan, PIN
```

## Supabase, cron & notifikasi

1. Salin `.env.example` → `.env.local` dan isi sendiri (lihat `../docs/04-SETUP-SUPABASE.md`). Jangan kirim kunci ke chat/git.
2. Jalankan migrasi `../supabase/migrations/*.sql`, aktifkan **pg_cron** + **pg_net**, deploy Edge Function `daily-reminders`.
3. Cron: **00:05 WIB** buat tagihan bulanan, **08:00 WIB** push pengingat ke iPhone yang sudah terpasang & mengizinkan notifikasi.
4. Di aplikasi: ikon **lonceng** (Beranda) = pusat pengingat + angka di ikon aplikasi; **Pengaturan → Notifikasi pengingat** = izinkan push.

## Belum ada (berikutnya)

- Login & data asli di **Supabase**: skema, cron, dan Edge Function sudah siap; data aplikasi masih mode demo sampai lapisan data disambungkan.
- Foto KTP / nota / bukti transfer (butuh Storage Supabase).
- Ekspor PDF (sekarang CSV yang bisa dibuka di Excel), notifikasi push pengingat.
