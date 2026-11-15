# Damar Kost — Product Requirements (Draft v0.1)

> Status: **Draft untuk diskusi** · Penulis: Product Owner · Tanggal: 15 Nov 2026
> Belum ada eksekusi. Dokumen ini untuk menyepakati *apa* yang dibangun dan *kenapa*, sebelum *bagaimana*.

---

## 1. Masalah yang mau diselesaikan

Pengelolaan kos di Indonesia mayoritas masih pakai **buku tulis, Excel, dan chat WhatsApp**. Akibatnya:

| Masalah | Dampak nyata |
|---|---|
| Tidak tahu persis siapa yang **belum bayar** bulan ini | Uang telat masuk, pemilik sungkan menagih, lupa menagih |
| Data penghuni tercecer (foto KTP di galeri HP, kontak darurat di chat) | Susah saat darurat, rawan bocor data pribadi |
| Status kamar (isi / kosong / mau keluar) hanya di kepala pemilik | Kamar kosong terlalu lama, kehilangan pemasukan |
| Pengeluaran (listrik, air, wifi, perbaikan) tidak dicatat rapi | Tidak tahu untung bersih per bulan |
| Keluhan penghuni (AC rusak, keran bocor) lewat chat dan tenggelam | Penghuni kesal, perbaikan lambat |

**Satu kalimat produk:**
> *Damar Kost membantu pemilik kos tahu kondisi kosnya — siapa yang tinggal, siapa yang belum bayar, kamar mana yang kosong — dalam 5 detik dari HP.*

---

## 2. Siapa penggunanya (Persona)

| Persona | Gambaran | Kebutuhan utama | Prioritas |
|---|---|---|---|
| **Pemilik kos** (Bu Ratna, 48th) | Punya 1–3 bangunan, 10–40 kamar. Pakai HP Android, aktif di WhatsApp, tidak suka aplikasi ribet. | Lihat siapa belum bayar, catat pembayaran cepat, laporan pemasukan bulanan | **Utama** |
| **Penghuni** (Sinta, 21th, mahasiswi) | Bayar per bulan, ingin tahu tagihan & sudah lunas atau belum, lapor kerusakan. | Lihat tagihan, kirim bukti transfer, lapor keluhan — **tanpa install aplikasi** | Ketiga |

**Keputusan PO:** Pemilik kos adalah user yang *membayar & memutuskan*. Semua keputusan desain mengutamakan dia. Penghuni dilayani lewat **link web ringan** (tanpa login rumit), bukan aplikasi terpisah.

---

## 3. Berpikir kritis: asumsi yang harus divalidasi

Sebelum membangun, ini asumsi yang kalau salah akan mengubah produk:

1. **"Pemilik mau input data awal."** — Input 30 kamar + 30 penghuni itu melelahkan. Kalau onboarding berat, produk ditinggal di hari pertama.
   → *Mitigasi:* wizard setup cepat (buat 20 kamar sekaligus dengan pola nomor), import dari Excel, boleh mulai dengan data minimal (nama + kamar + tanggal masuk + harga).
2. **"Pembayaran tercatat di sistem."** — Faktanya banyak penghuni bayar tunai/transfer lalu kirim bukti via WA. Sistem harus mengikuti kebiasaan ini, bukan memaksa.
   → *Mitigasi:* catat bayar manual 3 ketukan; payment gateway **bukan** MVP.
3. **"WhatsApp otomatis itu wajib."** — WhatsApp Business API berbayar dan butuh verifikasi.
   → *Mitigasi:* MVP pakai tombol **"Kirim via WA"** (link `wa.me` dengan pesan terisi otomatis). Otomasi penuh jadi fase lanjut.
4. **"Satu tanggal jatuh tempo untuk semua."** — Banyak kos menagih per *tanggal masuk* masing-masing penghuni (tgl 5, tgl 17, dst.), ada juga yang serentak tgl 1.
   → Sistem harus mendukung **dua mode** sejak awal (pengaturan per kos).
5. **"Ini dipakai satu pemilik saja vs. SaaS banyak pemilik."** — Sangat mempengaruhi arsitektur. → **Perlu keputusan Anda** (lihat §9).

---

## 4. Scope: apa yang MASUK dan TIDAK MASUK

### ✅ Masuk MVP (Fase 1) — "Tahu kondisi kos & tagih tepat waktu"

**A. Properti & Kamar**
- Kelola 1+ properti (bangunan kos)
- Kamar: nomor, lantai, tipe (mis. Standar / AC / Kamar mandi dalam), harga dasar, fasilitas
- Status kamar: **Terisi · Kosong · Dipesan · Perbaikan** (dihitung otomatis dari data penghuni bila memungkinkan)
- Buat banyak kamar sekaligus (mis. "101–110, lantai 1, Standar, Rp1.200.000")

**B. Penghuni**
- Profil: nama, no. HP/WA, asal/pekerjaan, kontak darurat, foto KTP (opsional, terenkripsi)
- Penempatan: kamar, tanggal masuk, periode sewa (bulanan/3 bulan/6 bulan/tahunan), harga sewa (bisa beda dari harga dasar), deposit
- Riwayat: penghuni lama tetap tersimpan setelah keluar (arsip, bukan dihapus)
- Check-out: tanggal keluar, pengembalian deposit (penuh/potong + alasan)

**C. Tagihan & Pembayaran** *(jantung produk)*
- Tagihan otomatis dibuat tiap periode (mode: per tanggal masuk / serentak)
- Komponen tagihan: sewa + biaya tambahan (listrik, parkir, laundry, tamu menginap, dll.) + denda telat (opsional, aturan per kos)
- Status: **Belum bayar · Sebagian · Lunas · Telat**
- Catat pembayaran: nominal, tanggal, metode (tunai / transfer / QRIS), lampiran bukti
- Pembayaran sebagian (cicil) & kelebihan bayar (jadi saldo)
- Kuitansi digital (link / gambar) yang bisa dikirim ke WA
- Tombol **"Ingatkan via WA"** dengan template pesan sopan yang bisa diubah

**D. Dashboard (Beranda)**
- Pemasukan bulan ini vs target
- Daftar **belum bayar / jatuh tempo 7 hari ke depan**
- Okupansi: X dari Y kamar terisi
- Penghuni yang akan habis kontrak / mau keluar

**E. Pengeluaran sederhana**
- Catat pengeluaran: kategori (listrik, air, wifi, kebersihan, perbaikan, lain-lain), nominal, tanggal, foto nota
- Laporan bulanan: **Pemasukan − Pengeluaran = Laba bersih**, bisa diekspor (PDF/Excel)

**F. Akun & Tampilan**
- **Satu akun saja: pemilik.** Tidak ada peran/akun tambahan (penjaga, admin, dll.)
- Login pemilik (email/no. HP + password), sesi tetap masuk di HP sendiri; opsional PIN aplikasi
- Mode terang / **mode gelap** (ikut sistem atau pilih manual)
- Bahasa **Indonesia / English** (bisa diganti kapan saja di menu)
- Riwayat perubahan sederhana untuk data keuangan (catatan bayar yang dibatalkan tetap terlihat beserta alasannya)

**G. Homestay (sewa harian) — diatur sendiri oleh pemilik**
- **Jenis sewa per kamar** di Pengaturan: **Bulanan** (kos) · **Harian** (homestay) · **Keduanya** (kamar kos yang kosong boleh disewakan harian sampai ada penghuni bulanan). Bisa diubah kapan saja.
- Harga per malam per kamar (+ opsional harga akhir pekan), jam check-in/check-out.
- **Pesanan (booking)**: kamar, tanggal masuk–keluar, nama + no. HP tamu, jumlah tamu, **sumber pesanan** (daftar bisa diedit sendiri: Langsung/WA, Walk-in, Airbnb, Traveloka, Booking.com, …), harga, **komisi aplikasi travel** (% per sumber), DP/lunas, catatan.
- **Kalender homestay** 2 minggu ke depan: lihat malam terisi/kosong, cegah pesanan bentrok di kamar yang sama.
- Status harian: **Tamu menginap · Check-in hari ini · Check-out hari ini · Siap disewa · Perlu dibersihkan**.
- Foto KTP tamu **opsional** (pemilik bisa mewajibkan lewat Pengaturan).
- Pesan WA ke tamu: konfirmasi pesanan & info check-in (template, ID/EN).
- Laporan memisahkan **pemasukan kos** dan **pemasukan homestay** (bersih setelah komisi); okupansi homestay = malam terisi / malam tersedia.
- Kamar dengan jenis **Harian** tidak dibuatkan tagihan bulanan.

### 🟡 Fase 2 — "Penghuni ikut terlibat"
- **Portal penghuni via link** (tanpa install): lihat tagihan, riwayat bayar, upload bukti transfer, unduh kuitansi
- Pemilik **verifikasi** bukti transfer (1 ketukan: setujui / tolak)
- **Keluhan & perbaikan (tiket):** penghuni lapor + foto → status Dilaporkan · Dikerjakan · Selesai
- Pengumuman ke semua penghuni (mis. "Air mati Sabtu 08.00–12.00")
- Meter listrik/air per kamar (input angka meter → tagihan otomatis)
- Daftar tunggu calon penghuni & booking kamar (dengan DP)

### 🔵 Fase 3 — "Otomatis & berkembang"
- Pembayaran online (QRIS dinamis / VA lewat payment gateway) → status lunas otomatis
- Pengingat WA otomatis terjadwal (WA Business API)
- Kontrak/perjanjian sewa digital + tanda tangan
- Inventaris kamar (kasur, lemari, AC) & jadwal servis AC
- Laporan lanjutan: tren okupansi, rata-rata lama tinggal, penghuni paling sering telat
- Multi-bahasa (untuk penghuni WNA) & mode gelap

### ❌ Sengaja TIDAK dibangun (setidaknya sampai ada bukti kebutuhan)
- **Marketplace / listing pencarian kos publik** — itu bisnis berbeda (bersaing dengan Mamikos dkk.), butuh traffic & moderasi.
- Akuntansi lengkap (jurnal, neraca, pajak) — cukup laporan arus kas sederhana.
- Smart lock / IoT — mahal, kebutuhan niche.
- Chat internal di aplikasi — penghuni & pemilik sudah nyaman di WhatsApp; jangan bersaing dengan WA, **integrasikan** saja.

---

## 5. User stories prioritas (MVP)

Format: *Sebagai [peran], saya ingin [aksi], agar [manfaat].* — kriteria terima singkat.

| # | Story | Kriteria terima |
|---|---|---|
| US-01 | Sebagai pemilik, saya ingin melihat siapa yang belum bayar bulan ini di layar pertama, agar bisa langsung menagih. | Beranda menampilkan daftar belum bayar + total nominal, terurut paling lama telat. |
| US-02 | Sebagai pemilik, saya ingin mencatat pembayaran dalam ≤3 ketukan, agar tidak malas mencatat. | Dari daftar tagihan: ketuk penghuni → "Tandai lunas" (nominal & tanggal terisi otomatis) → simpan. |
| US-03 | Sebagai pemilik, saya ingin mengirim pengingat lewat WA dengan pesan siap pakai, agar tidak sungkan menagih. | Tombol membuka WA dengan pesan berisi nama, kamar, nominal, jatuh tempo. Template bisa diedit. |
| US-04 | Sebagai pemilik, saya ingin melihat denah/grid kamar berwarna sesuai status, agar tahu kondisi kos sekilas. | Grid per lantai, warna + label status, ketuk kamar → detail. |
| US-05 | Sebagai pemilik baru, saya ingin setup kos saya dalam <10 menit, agar langsung bisa pakai. | Wizard: nama kos → buat kamar massal → tambah penghuni (minimal 4 field) → selesai. |
| US-06 | Sebagai pemilik, saya ingin mencatat penghuni keluar beserta pengembalian deposit, agar riwayatnya jelas. | Check-out mengubah status kamar jadi Kosong, deposit tercatat (kembali/potong + alasan). |
| US-07 | Sebagai pemilik, saya ingin laporan laba bersih bulanan, agar tahu kos saya untung berapa. | Laporan per bulan/properti, ekspor PDF & Excel. |
| US-08 | Sebagai pemilik, saya ingin memakai mode gelap dan memilih bahasa Indonesia/English, agar nyaman dipakai malam hari & bisa dibaca orang lain. | Toggle tema & bahasa di menu; pilihan tersimpan dan berlaku di semua halaman. |

---

## 6. Aturan bisnis penting (yang sering terlupa)

- **Prorata:** penghuni masuk tengah bulan pada mode "serentak" → tagihan pertama dihitung prorata (bisa dimatikan).
- **Denda telat:** opsional; nominal tetap per hari atau sekali; ada masa tenggang (mis. 3 hari).
- **Deposit bukan pemasukan** — dicatat terpisah, tidak masuk laba sampai dipotong.
- **Kenaikan harga:** perubahan harga kamar tidak mengubah tagihan yang sudah terbit; berlaku periode berikutnya.
- **Pindah kamar:** penghuni sama, kamar berubah → riwayat tetap satu profil.
- **Satu kamar bisa diisi >1 orang** (kamar sharing/pasutri) — satu penanggung jawab tagihan.
- **Penghapusan:** data keuangan tidak bisa dihapus permanen, hanya dibatalkan (void) dengan alasan → jejak audit tetap ada.

---

## 7. Kebutuhan non-fungsional

| Aspek | Target |
|---|---|
| Platform | **Aplikasi HP saja (iPhone)**, dibangun sebagai **PWA**: dibuka dari Safari lalu "Tambahkan ke Layar Utama" sehingga tampil layar penuh seperti aplikasi. Tanpa App Store, tanpa Mac. **Tidak ada versi website/laptop.** |
| Kecepatan | Beranda tampil < 2 detik di koneksi 4G biasa |
| Offline ringan | Bisa lihat data terakhir saat sinyal jelek; catat bayar tersinkron saat online (Fase 2) |
| Privasi data | Patuh **UU PDP**: foto KTP terenkripsi, akses berbasis peran, penghuni bisa minta data dihapus setelah keluar |
| Backup | Backup harian otomatis; pemilik bisa ekspor semua datanya kapan saja |
| Bahasa | Bahasa Indonesia sehari-hari (bukan bahasa akuntan) |
| Format | Rupiah `Rp1.250.000`, tanggal `15 Nov 2026`, zona waktu WIB/WITA/WIT per properti |

---

## 8. Ukuran keberhasilan

| Metrik | Kenapa penting | Target awal |
|---|---|---|
| Waktu setup kos pertama | Indikator onboarding tidak ribet | < 10 menit |
| Waktu mencatat 1 pembayaran | Kalau lama, orang kembali ke buku | < 15 detik |
| % tagihan lunas sebelum/tepat jatuh tempo | Nilai inti bagi pemilik | Naik ≥ 20% setelah 3 bulan |
| Pemilik aktif mingguan | Produk benar-benar dipakai | ≥ 70% dari pendaftar |

---

## 9. Keputusan & pertanyaan terbuka

### ✅ Sudah diputuskan (15 Nov 2026)
| # | Topik | Keputusan | Dampak |
|---|---|---|---|
| 1 | Model produk | **Satu pemilik** (bukan SaaS) | Tanpa multi-tenant, tanpa registrasi publik & billing langganan. **Hanya 1 pengguna (pemilik)** — tanpa akun penjaga/peran/hak akses. |
| 2 | Skala | **9 kamar** (1 properti) | Grid kamar 3×3 muat 1 layar; tidak perlu pencarian/filter berat, paginasi, atau buat-kamar-massal yang rumit. Data model tetap boleh tambah kamar/properti nanti. |
| 4 | Platform | **Aplikasi HP saja, iPhone → PWA** (15 Nov 2026) | Pemilik tidak nyaman memakai laptop. Semua fitur harus lengkap di HP; tidak ada desain/halaman web. Batasan PWA di iPhone: notifikasi push hanya jika sudah dipasang ke layar utama (iOS 16.4+), kamera untuk foto nota/KTP lewat input file. Mockup web lama diarsipkan di `docs/mockup-arsip-web/`. |
| 3 | Portal penghuni | **Fleksibel** | Dibangun setelah inti pemilik stabil; arsitektur disiapkan (link unik per penghuni) agar bisa dinyalakan kapan saja. |
| 5 | Jenis sewa | **Bulanan + homestay harian**, diatur pemilik per kamar (15 Nov 2026) | Lihat bagian G. Tambah tabel pesanan, kalender, sumber pesanan & komisi; laporan dipisah kos vs homestay. |

### ❓ Masih terbuka
4. **Pembayaran online:** perlu sejak awal, atau cukup catat manual dulu?
8. **Sinkron kalender aplikasi travel** (iCal Airbnb/Booking.com) agar tidak dobel pesanan — perlu di MVP atau dicatat manual dulu?
