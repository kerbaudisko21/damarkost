-- Damar Kost — skema awal (Supabase / Postgres 15+)
-- Satu pemilik = satu pengguna. Semua tabel dilindungi RLS: hanya pemilik (owner_id = auth.uid()).
-- Uang: bigint Rupiah. Tanggal: date (zona Asia/Jakarta). Data keuangan tidak dihapus, hanya dibatalkan (voided_at).

create extension if not exists btree_gist;

-- ---------- Pengaturan kos (1 baris per pemilik) ----------
create table property (
  owner_id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text not null default 'Damar Kost',
  owner_name text not null default '',
  bank_account text not null default '',
  billing_mode text not null default 'entry' check (billing_mode in ('entry', 'fixed')),
  fixed_day smallint not null default 1 check (fixed_day between 1 and 28),
  prorata boolean not null default true,
  late_fee_enabled boolean not null default false,
  grace_days smallint not null default 3 check (grace_days >= 0),
  late_fee_per_day bigint not null default 10000 check (late_fee_per_day >= 0),
  check_in_time text not null default '14.00',
  check_out_time text not null default '12.00',
  require_guest_ktp boolean not null default false,
  templates jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table room (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  code text not null,
  floor smallint not null,
  type text not null check (type in ('standard', 'ac')),
  base_price bigint not null check (base_price >= 0),
  nightly_price bigint not null default 0 check (nightly_price >= 0),
  rent_mode text not null default 'monthly' check (rent_mode in ('monthly', 'daily', 'both')),
  facilities text[] not null default '{}',
  repair_until date,
  repair_note text,
  needs_cleaning boolean not null default false,
  unique (owner_id, code)
);

create table tenant (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  full_name text not null,
  phone text not null,
  job text, hometown text, emergency text,
  ktp_path text,                 -- objek di bucket privat 'private'
  archived_at date,
  delete_personal_after date,    -- UU PDP: hapus data pribadi penghuni arsip
  created_at timestamptz not null default now()
);

create table lease (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  tenant_id uuid not null references tenant on delete restrict,
  room_id uuid not null references room on delete restrict,
  start_date date not null,
  end_date date,
  planned_end date,
  rent bigint not null check (rent >= 0),
  due_day smallint not null check (due_day between 1 and 31),
  deposit bigint not null default 0,
  deposit_status text not null default 'held' check (deposit_status in ('held', 'refunded', 'deducted')),
  deduction bigint, deduction_reason text,
  check (end_date is null or end_date > start_date),
  -- satu kamar tidak boleh punya dua sewa bulanan yang tumpang tindih
  exclude using gist (room_id with =, daterange(start_date, coalesce(end_date, 'infinity')) with &&)
);

create table invoice (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  lease_id uuid not null references lease on delete restrict,
  period char(7) not null,       -- 'YYYY-MM'
  due_date date not null,
  amount bigint not null check (amount >= 0),
  voided_at timestamptz, void_reason text,
  unique (lease_id, period)
);

create table payment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  invoice_id uuid not null references invoice on delete restrict,
  amount bigint not null check (amount > 0),
  paid_at date not null default (now() at time zone 'Asia/Jakarta')::date,
  method text not null check (method in ('cash', 'transfer', 'qris')),
  proof_path text,
  voided_at timestamptz, void_reason text,
  created_at timestamptz not null default now()
);

create table expense (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  category text not null check (category in ('elec', 'water', 'wifi', 'clean', 'repair', 'other')),
  amount bigint not null check (amount > 0),
  note text not null default '',
  receipt_path text,
  voided_at timestamptz
);

create table booking_source (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  commission_pct numeric(5,2) not null default 0 check (commission_pct between 0 and 100),
  color text not null default '#9A7149',
  active boolean not null default true
);

create table booking (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  room_id uuid not null references room on delete restrict,
  source_id uuid references booking_source on delete set null,
  guest_name text not null,
  guest_phone text not null default '',
  guests smallint not null default 1 check (guests > 0),
  check_in date not null,
  check_out date not null,
  nights int generated always as (check_out - check_in) stored,
  nightly_rate bigint not null check (nightly_rate >= 0),
  commission_pct numeric(5,2) not null default 0,
  paid_status text not null default 'unpaid' check (paid_status in ('unpaid', 'dp', 'paid')),
  dp_amount bigint not null default 0,
  status text not null default 'booked' check (status in ('booked', 'in', 'out', 'cancelled')),
  ktp_path text,
  note text,
  created_at timestamptz not null default now(),
  check (check_out > check_in),
  -- database menolak pesanan bentrok di kamar yang sama (check-out = check-in tamu berikut tetap boleh)
  exclude using gist (room_id with =, daterange(check_in, check_out) with &&) where (status <> 'cancelled')
);

create table audit_log (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  table_name text not null, row_id uuid not null, action text not null, detail jsonb,
  at timestamptz not null default now()
);

-- ---------- RLS: hanya pemilik ----------
do $$
declare t text;
begin
  foreach t in array array['property','room','tenant','lease','invoice','payment','expense','booking_source','booking','audit_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy owner_all on %I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;

-- ---------- Tagihan otomatis (dipanggil pg_cron tiap hari 00:05 WIB) ----------
create or replace function generate_invoices(p_today date default (now() at time zone 'Asia/Jakarta')::date)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_period char(7) := to_char(p_today, 'YYYY-MM');
  v_start date := date_trunc('month', p_today)::date;
  v_end date := (date_trunc('month', p_today) + interval '1 month - 1 day')::date;
  v_count int := 0;
  r record;
  v_day int; v_due date; v_amount bigint; v_days int;
begin
  for r in
    select l.*, p.billing_mode, p.fixed_day, p.prorata
    from lease l
    join room rm on rm.id = l.room_id and rm.rent_mode <> 'daily'
    join property p on p.owner_id = l.owner_id
    where l.start_date <= v_end and (l.end_date is null or l.end_date > v_start)
      and not exists (select 1 from invoice i where i.lease_id = l.id and i.period = v_period)
  loop
    v_day := case when r.billing_mode = 'fixed' then r.fixed_day else r.due_day end;
    v_due := least(v_start + (v_day - 1), v_end);
    v_amount := r.rent;
    if r.billing_mode = 'fixed' and r.prorata and to_char(r.start_date, 'YYYY-MM') = v_period then
      v_days := extract(day from v_end)::int;
      v_amount := round(r.rent * (v_days - extract(day from r.start_date)::int + 1)::numeric / v_days);
    end if;
    insert into invoice (owner_id, lease_id, period, due_date, amount) values (r.owner_id, r.id, v_period, v_due, v_amount);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- Jadwal (aktifkan ekstensi pg_cron di dashboard Supabase lebih dulu):
-- select cron.schedule('damar-invoices', '5 17 * * *', $$select generate_invoices()$$);  -- 17:05 UTC = 00:05 WIB

-- ---------- View untuk layar ----------
create or replace view v_invoice_status with (security_invoker = true) as
select i.*,
  coalesce((select sum(amount) from payment p where p.invoice_id = i.id and p.voided_at is null), 0) as paid_sum,
  case
    when coalesce((select sum(amount) from payment p where p.invoice_id = i.id and p.voided_at is null), 0) >= i.amount then 'paid'
    when (now() at time zone 'Asia/Jakarta')::date > i.due_date then 'late'
    when exists (select 1 from payment p where p.invoice_id = i.id and p.voided_at is null) then 'partial'
    else 'due'
  end as state
from invoice i where i.voided_at is null;

-- ---------- Penyimpanan foto (KTP, nota, bukti transfer) ----------
insert into storage.buckets (id, name, public) values ('private', 'private', false) on conflict do nothing;
create policy owner_files on storage.objects for all
  using (bucket_id = 'private' and owner = auth.uid())
  with check (bucket_id = 'private' and owner = auth.uid());
