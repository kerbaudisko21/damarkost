# Damar Kost

Aplikasi HP (PWA untuk iPhone) untuk mengelola **kos bulanan + homestay harian** Damar Kost — 1 pemilik, 9 kamar.

| Folder | Isi |
|---|---|
| [`app/`](app/) | Aplikasi React + TypeScript + Vite (PWA). Lihat [app/README.md](app/README.md) untuk menjalankan. |
| [`supabase/`](supabase/) | Migrasi database (tabel, RLS, anti-bentrok, cron) & Edge Function pengingat. |
| [`docs/`](docs/) | PRD, konsep desain, rencana teknis, panduan setup Supabase. |
| [`brand/`](brand/) | Logo & ikon aplikasi (SVG). |

## Mulai cepat

```bash
cd app
npm install
npm run dev
```

Tanpa `.env.local` aplikasi berjalan dalam **mode demo** (data contoh disimpan di perangkat). Untuk data asli, ikuti [docs/04-SETUP-SUPABASE.md](docs/04-SETUP-SUPABASE.md).

> Jangan commit file `.env.local` atau kunci Supabase/VAPID apa pun.
