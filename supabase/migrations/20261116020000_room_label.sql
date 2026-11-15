-- Semua kamar Damar Kost ber-AC → tipe Standar/AC tidak dipakai lagi.
-- Diganti keterangan bebas opsional (mis. 'Kamar mandi dalam').
alter table room add column if not exists label text;
alter table room drop column if exists type;
