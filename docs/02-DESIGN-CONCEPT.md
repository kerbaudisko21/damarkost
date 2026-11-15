# Damar Kost — Konsep Design (Draft v0.2)

> Disusun oleh **Tim Design** · Tanggal: 15 Nov 2026
> Mengacu ke [01-PRD.md](01-PRD.md). Belum ada mockup final — ini arah & aturan main.

## Tim Design & tanggung jawab

| Peran | Fokus di proyek ini |
|---|---|
| **UX Researcher** | Validasi asumsi PRD: wawancara 5–8 pemilik kos, amati cara mereka mencatat sekarang (buku, Excel, WA) |
| **Product / UX Designer** | Alur (flow), arsitektur informasi, wireframe, prototipe uji |
| **UI Designer** | Design system: warna, tipografi, komponen, ikon, ilustrasi |
| **UX Writer** | Bahasa antarmuka, template pesan WA penagihan, teks kosong (empty state) & error |

---

## 1. Konsep: **"Rumah Kayu & Daun"** (mengikuti logo Damar Kost)

Identitas diambil dari logo **Damar Kost**: rumah berbingkai kayu, tanaman hijau zaitun, dan huruf serif klasik di atas krem gading. Aplikasi harus terasa seperti **rumah yang terawat dan rapi**, bukan software akuntansi. Sengaja dibuat berbeda dari proyek Harvest (yang memakai hijau emerald + amber, Plus Jakarta Sans, dan menu samping).

| Kami ingin terasa... | ...bukan |
|---|---|
| Hangat, ramah, manusiawi | Kaku, korporat, dingin |
| Ringan dan lega (banyak ruang kosong) | Padat tabel dan angka |
| Jelas dalam sekali lihat | Perlu dibaca berkali-kali |
| Modern tapi akrab bagi usia 45+ | Trendi tapi membingungkan |

---

## 2. Prinsip desain (dipakai untuk memutuskan setiap layar)

1. **Satu layar, satu tujuan.** Setiap layar menjawab satu pertanyaan ("Siapa yang belum bayar?"). Hal lain disembunyikan di detail.
2. **Angka penting dulu, detail belakangan.** Ringkasan besar di atas, rincian bisa diketuk.
3. **Aksi utama selalu di jangkauan jempol.** Tab bar melayang di bawah layar HP, bukan menu hamburger.
4. **Warna tidak pernah sendirian.** Status selalu = warna **+ label + ikon** (aman untuk buta warna & layar HP murah).
5. **Bahasa sehari-hari.** "Belum bayar", bukan "Outstanding receivable". "Penghuni keluar", bukan "Terminasi kontrak".
6. **Maafkan kesalahan.** Setiap aksi penting bisa dibatalkan ("Pembayaran dicatat · **Urungkan**") daripada dialog konfirmasi bertubi-tubi.
7. **Isi otomatis sebanyak mungkin.** Nominal, tanggal hari ini, metode terakhir — user cukup mengecek, bukan mengetik.

---

## 3. Arah visual

### Warna (dari logo)
| Token | Nilai | Pemakaian |
|---|---|---|
| `zaitun-800` (Primary) | `#3B4A2C` | Tombol utama, menu aktif, kartu ringkasan |
| `kayu-500` | `#9A7149` | Aksen merek (garis, label KOST, detail kecil) |
| `daun-50` | `#EEF0E4` | Latar lembut, highlight |
| `gading-50` (Background) | `#FBF9F3` | Latar aplikasi |
| `tinta-900` (Teks) | `#26251D` | Teks utama |
| `tinta-500` | `#6A6656` | Teks sekunder |
| Status **Lunas** | `#47662A` di atas `#E7EEDB` | + ikon centang |
| Status **Jatuh tempo** | `#7A5200` di atas `#FBF0D9` | + ikon jam |
| Status **Telat** | `#A13A20` di atas `#FBE4DC` | + ikon seru |
| Status **Kosong** | `#2D5A85` di atas `#E4EDF6` | + ikon pintu |
| Status **Perbaikan** | `#4E4870` di atas `#ECEAF3` | + ikon kunci pas |

### Mode gelap & bahasa
- **Mode gelap**: latar `#14150F`, kartu `#1D1F17`, teks `#EDEBE2` / `#ADAA9A`, aksen lembut `#2D3522` + `#C9D7A8`, kayu `#C99A6E`. Warna status punya versi gelapnya sendiri.
- **Bahasa**: Indonesia (default) & English. Semua teks UI dan template WA tersedia dalam dua bahasa; format Rupiah tetap `Rp1.250.000`.
- Pilihan tema & bahasa disimpan dan berlaku di semua halaman. Tombolnya: tab Lainnya & Pengaturan › Tampilan.

### Tipografi
- **Cinzel** (serif, senada dengan huruf logo) — hanya untuk merek & judul halaman.
- **Manrope** — isi, angka, tombol. Bersih dan sangat terbaca di HP.
- Skala: Angka besar 32 · Judul 20–30 · Isi 16 (minimum!) · Keterangan 13. Angka rupiah memakai *tabular numbers*.

### Gaya terpilih: "Hangat & visual" (v0.3)
- **Logo dipasang di semua layar**: tanda rumah+daun + wordmark DAMAR/KOST di header setiap layar; warna logo ikut mode gelap. File vektor: `brand/damar-kost-logo.svg`, ikon aplikasi `brand/damar-kost-icon.svg`.
- **Denah kamar = gambar rumah 2 lantai.** Atap & rangka kayu, setiap kamar adalah jendela berwarna status yang bisa diketuk; Lantai 1 punya pintu utama di tengah, tanaman di kiri-kanan. Dipakai di Beranda & tab Kamar.
- Ringkasan berupa **pil** ("Rp5,4 jt masuk · 56%", "3 belum bayar", "1 kamar kosong"), daftar "Perlu ditagih" di kartu daun dengan tombol **Tagih**.
- Hiasan daun tipis di pojok kartu besar; latar kartu rumah berwarna pasir hangat (`#F4EEE2`).

### Bentuk & kedalaman
- Sudut membulat **20–28px** pada kartu, tombol 12–14px, menu & chip berbentuk **pil**.
- Garis tepi hangat yang tipis (`#EAE4D8`) + bayangan sangat halus.
- Ikon: gaya **outline membulat** (mis. Lucide / Phosphor), tebal 2px.
- Ilustrasi kecil bernuansa rumah kayu & daun untuk empty state & onboarding (bukan stok foto).

### Gerak (motion)
- Halus & cepat (150–250ms). Dipakai untuk memberi umpan balik (centang "Lunas" muncul, kartu bergeser), bukan hiasan.
- Hormati pengaturan *reduce motion* di HP.

---

## 4. Arsitektur informasi (navigasi bawah, 4 tab + tombol aksi)

```
┌─────────────────────────────────────────┐
│  Beranda │ Kamar │  [ + ]  │ Tagihan │ Lainnya │
└─────────────────────────────────────────┘
```

| Tab | Isi |
|---|---|
| **Beranda** | Ringkasan bulan ini, daftar "Perlu ditagih", kamar kosong, penghuni mau keluar |
| **Kamar** | Grid/denah kamar per lantai berwarna status → detail kamar & penghuninya |
| **[ + ] Aksi cepat** | Lembar bawah (bottom sheet): Catat bayar · Penghuni baru · Catat pengeluaran · (F2) Keluhan |
| **Tagihan** | Filter: Belum bayar / Lunas / Semua · per bulan |
| **Lainnya** | Penghuni (daftar & arsip), Pengeluaran, Laporan, Template WA, Pengaturan kos (termasuk mode gelap & bahasa ID/EN) |

**Hanya HP (iPhone, PWA).** Tidak ada tata letak desktop/tablet. Ukuran acuan 390×844; tab bar melayang memperhitungkan *safe area* bawah iPhone.

---

## 5. Layar kunci (wireframe kata-kata)

### 5.1 Beranda
```
Selamat pagi, Bu Ratna 👋            [Damar Kost ▾]
┌───────────────────────────────────────┐
│ Pemasukan November                      │
│ Rp18.400.000  dari Rp24.000.000        │
│ ███████████████░░░░░  77%               │
└───────────────────────────────────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 4        │ │ 3        │ │ 2        │
│ Belum    │ │ Kamar    │ │ Mau      │
│ bayar    │ │ kosong   │ │ keluar   │
└──────────┘ └──────────┘ └──────────┘

Perlu ditagih                       Lihat semua
● Sinta · Kamar 204     Telat 5 hari   Rp1.300.000  [WA]
● Andi  · Kamar 101     Jatuh tempo besok Rp1.200.000 [WA]
```

### 5.2 Kamar (signature screen)
Grid ubin per lantai — setiap ubin = satu kamar, warna + label status, nama penghuni singkat.
```
Lantai 1                          [Semua ▾]
┌─────┐┌─────┐┌─────┐┌─────┐
│ 101 ││ 102 ││ 103 ││ 104 │
│Andi ││Kosong││Rina ││Perbaikan│
│ ⏰  ││ 🚪  ││ ✓   ││ 🔧  │
└─────┘└─────┘└─────┘└─────┘
```
Inilah "wajah" aplikasi: pemilik langsung *melihat* kosnya, bukan membaca tabel.

### 5.3 Catat pembayaran (target ≤3 ketukan)
1. Ketuk kartu penghuni di "Perlu ditagih" → lembar bawah terbuka
2. Nominal, tanggal hari ini, metode terakhir **sudah terisi** → cek saja
3. **[Tandai Lunas]** → centang beranimasi + toast "Tersimpan · Kirim kuitansi via WA?"

### 5.4 Penghuni baru (wizard 3 langkah)
`Data diri (nama, WA)` → `Kamar & harga (dipilih dari kamar kosong)` → `Tanggal masuk & deposit` → selesai.
KTP & kontak darurat bisa dilengkapi belakangan (tandai "Data belum lengkap").

### 5.5 Pengingat WA (UX Writer)
Template default — sopan, tidak mengintimidasi:
> Halo Kak **Sinta**, semoga sehat selalu 🙏
> Mengingatkan sewa **Kamar 204** bulan **November** sebesar **Rp1.300.000** jatuh tempo **10 Nov**.
> Bisa transfer ke BCA 123xxxx a.n. Ratna. Terima kasih! — *Damar Kost*

---

## 6. Komponen inti (design system awal)

| Komponen | Catatan |
|---|---|
| Kartu ringkasan (stat card) | Angka besar + label + tren kecil |
| Baris penghuni/tagihan | Avatar inisial, nama, kamar, chip status, nominal, aksi cepat (WA) |
| Ubin kamar | 4 varian status, ukuran sentuh ≥ 72px |
| Chip status | Warna + ikon + teks, tidak pernah hanya warna |
| Bottom sheet | Untuk semua form singkat (bukan pindah halaman) |
| Toast + Urungkan | Umpan balik setelah aksi |
| Empty state | Ilustrasi + 1 kalimat + 1 tombol ("Belum ada kamar. **Buat kamar sekaligus**") |
| Input rupiah | Format otomatis `Rp1.250.000`, keyboard angka |

---

## 7. Aksesibilitas & kenyamanan (wajib, bukan bonus)

- Ukuran teks minimum 16px; dukung pembesaran teks sistem HP.
- Target sentuh minimum 44×44px.
- Kontras teks memenuhi WCAG AA.
- Tidak bergantung pada gestur tersembunyi (swipe) untuk aksi penting — selalu ada tombol terlihat.
- Uji di **HP Android kelas menengah ke bawah** & layar 360px, bukan hanya iPhone terbaru.

---

## 8. Rencana kerja Tim Design (setelah PRD disepakati)

1. **Riset singkat** (UX Researcher) — wawancara pemilik kos, validasi 5 asumsi PRD.
2. **Alur & wireframe** (UX Designer) — Beranda, Kamar, Catat bayar, Penghuni baru, Laporan.
3. **Moodboard & design system v0** (UI Designer) — warna, tipografi, 8 komponen inti di atas.
4. **Prototipe klik + uji** dengan 3–5 pemilik kos: "Catat pembayaran Andi" & "Siapa yang belum bayar?" — ukur waktu & kebingungan.
5. **Iterasi → handoff** ke developer.
